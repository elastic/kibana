/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
  HttpStart,
  IBasePath,
} from 'src/core/public';
import { i18n } from '@kbn/i18n';
import type {
  AuthenticatedUser,
  SecurityPluginSetup,
  SecurityPluginStart,
} from '../../security/public';
import { getIsCloudEnabled } from '../common/is_cloud_enabled';
import { ELASTIC_SUPPORT_LINK } from '../common/constants';
import { HomePublicPluginSetup } from '../../../../src/plugins/home/public';
import { createUserMenuLinks } from './user_menu_links';
import { getFullCloudUrl } from './utils';

export interface CloudConfigType {
  id?: string;
  cname?: string;
  base_url?: string;
  profile_url?: string;
  deployment_url?: string;
  organization_url?: string;
  full_story: {
    enabled: boolean;
    org_id?: string;
  };
}

interface CloudSetupDependencies {
  home?: HomePublicPluginSetup;
  security?: Pick<SecurityPluginSetup, 'authc'>;
}

interface CloudStartDependencies {
  security?: SecurityPluginStart;
}

export interface CloudSetup {
  cloudId?: string;
  cname?: string;
  baseUrl?: string;
  deploymentUrl?: string;
  profileUrl?: string;
  organizationUrl?: string;
  isCloudEnabled: boolean;
}

export class CloudPlugin implements Plugin<CloudSetup> {
  private config!: CloudConfigType;
  private isCloudEnabled: boolean;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.config = this.initializerContext.config.get<CloudConfigType>();
    this.isCloudEnabled = false;
  }

  public setup(core: CoreSetup, { home, security }: CloudSetupDependencies) {
    this.setupFullstory({ basePath: core.http.basePath, security }).catch((e) =>
      // eslint-disable-next-line no-console
      console.debug(`Error setting up FullStory: ${e.toString()}`)
    );

    const {
      id,
      cname,
      profile_url: profileUrl,
      organization_url: organizationUrl,
      deployment_url: deploymentUrl,
      base_url: baseUrl,
    } = this.config;
    this.isCloudEnabled = getIsCloudEnabled(id);

    if (home) {
      home.environment.update({ cloud: this.isCloudEnabled });
      if (this.isCloudEnabled) {
        home.tutorials.setVariable('cloud', { id, baseUrl, profileUrl });
      }
    }

    return {
      cloudId: id,
      cname,
      baseUrl,
      deploymentUrl: getFullCloudUrl(baseUrl, deploymentUrl),
      profileUrl: getFullCloudUrl(baseUrl, profileUrl),
      organizationUrl: getFullCloudUrl(baseUrl, organizationUrl),
      isCloudEnabled: this.isCloudEnabled,
    };
  }

  public start(coreStart: CoreStart, { security }: CloudStartDependencies) {
    const { deployment_url: deploymentUrl, base_url: baseUrl } = this.config;
    coreStart.chrome.setHelpSupportUrl(ELASTIC_SUPPORT_LINK);

    const setLinks = (authorized: boolean) => {
      if (!authorized) return;

      if (baseUrl && deploymentUrl) {
        coreStart.chrome.setCustomNavLink({
          title: i18n.translate('xpack.cloud.deploymentLinkLabel', {
            defaultMessage: 'Manage this deployment',
          }),
          euiIconType: 'arrowLeft',
          href: getFullCloudUrl(baseUrl, deploymentUrl),
        });
      }

      if (security && this.isCloudEnabled) {
        const userMenuLinks = createUserMenuLinks(this.config);
        security.navControlService.addUserMenuLinks(userMenuLinks);
      }
    };

    this.checkIfAuthorizedForLinks({ http: coreStart.http, security })
      .then(setLinks)
      // In the event of an unexpected error, fail *open*.
      // Cloud admin console will always perform the actual authorization checks.
      .catch(() => setLinks(true));
  }

  /**
   * Determines if the current user should see links back to Cloud.
   * This isn't a true authorization check, but rather a heuristic to
   * see if the current user is *likely* a cloud deployment administrator.
   *
   * At this point, we do not have enough information to reliably make this determination,
   * but we do know that all cloud deployment admins are superusers by default.
   */
  private async checkIfAuthorizedForLinks({
    http,
    security,
  }: {
    http: HttpStart;
    security?: SecurityPluginStart;
  }) {
    if (http.anonymousPaths.isAnonymous(window.location.pathname)) {
      return false;
    }
    // Security plugin is disabled
    if (!security) return true;
    // Otherwise check roles. If user is not defined due to an unexpected error, then fail *open*.
    // Cloud admin console will always perform the actual authorization checks.
    const user = await security.authc.getCurrentUser().catch(() => null);
    return user?.roles.includes('superuser') ?? true;
  }

  private async setupFullstory({
    basePath,
    security,
  }: CloudSetupDependencies & { basePath: IBasePath }) {
    const { enabled, org_id: orgId } = this.config.full_story;
    if (!enabled || !orgId) {
      return;
    }

    // Keep this import async so that we do not load any FullStory code into the browser when it is disabled.
    const fullStoryChunkPromise = import('./fullstory');
    const userIdPromise: Promise<string | undefined> = security
      ? loadFullStoryUserId({ getCurrentUser: security.authc.getCurrentUser })
      : Promise.resolve(undefined);

    const [{ initializeFullStory }, userId] = await Promise.all([
      fullStoryChunkPromise,
      userIdPromise,
    ]);

    initializeFullStory({
      basePath,
      orgId,
      packageInfo: this.initializerContext.env.packageInfo,
      userId,
    });
  }
}

/** @internal exported for testing */
export const loadFullStoryUserId = async ({
  getCurrentUser,
}: {
  getCurrentUser: () => Promise<AuthenticatedUser>;
}) => {
  try {
    const currentUser = await getCurrentUser().catch(() => undefined);
    if (!currentUser) {
      return undefined;
    }

    // Log very defensively here so we can debug this easily if it breaks
    if (!currentUser.username) {
      // eslint-disable-next-line no-console
      console.debug(
        `[cloud.full_story] username not specified. User metadata: ${JSON.stringify(
          currentUser.metadata
        )}`
      );
    }

    return currentUser.username;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`[cloud.full_story] Error loading the current user: ${e.toString()}`, e);
    return undefined;
  }
};
