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
  ApplicationStart,
} from 'src/core/public';
import { i18n } from '@kbn/i18n';
import { Subscription } from 'rxjs';
import { mapKeys, snakeCase } from 'lodash';
import type {
  AuthenticatedUser,
  SecurityPluginSetup,
  SecurityPluginStart,
} from '../../security/public';
import { getIsCloudEnabled } from '../common/is_cloud_enabled';
import { ELASTIC_SUPPORT_LINK, CLOUD_SNAPSHOTS_PATH } from '../common/constants';
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
  snapshotsUrl?: string;
  isCloudEnabled: boolean;
}

interface SetupFullstoryDeps extends CloudSetupDependencies {
  application?: Promise<ApplicationStart>;
  basePath: IBasePath;
}

export class CloudPlugin implements Plugin<CloudSetup> {
  private config!: CloudConfigType;
  private isCloudEnabled: boolean;
  private appSubscription?: Subscription;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.config = this.initializerContext.config.get<CloudConfigType>();
    this.isCloudEnabled = false;
  }

  public setup(core: CoreSetup, { home, security }: CloudSetupDependencies) {
    const application = core.getStartServices().then(([coreStart]) => {
      return coreStart.application;
    });
    this.setupFullstory({ basePath: core.http.basePath, security, application }).catch((e) =>
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

    const fullCloudDeploymentUrl = getFullCloudUrl(baseUrl, deploymentUrl);
    const fullCloudProfileUrl = getFullCloudUrl(baseUrl, profileUrl);
    const fullCloudOrganizationUrl = getFullCloudUrl(baseUrl, organizationUrl);
    const fullCloudSnapshotsUrl = `${fullCloudDeploymentUrl}/${CLOUD_SNAPSHOTS_PATH}`;

    return {
      cloudId: id,
      cname,
      baseUrl,
      deploymentUrl: fullCloudDeploymentUrl,
      profileUrl: fullCloudProfileUrl,
      organizationUrl: fullCloudOrganizationUrl,
      snapshotsUrl: fullCloudSnapshotsUrl,
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

  public stop() {
    this.appSubscription?.unsubscribe();
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

  private async setupFullstory({ basePath, security, application }: SetupFullstoryDeps) {
    const { enabled, org_id: orgId } = this.config.full_story;
    if (!enabled || !orgId) {
      return; // do not load any fullstory code in the browser if not enabled
    }

    // Keep this import async so that we do not load any FullStory code into the browser when it is disabled.
    const fullStoryChunkPromise = import('./fullstory');
    const userIdPromise: Promise<string | undefined> = security
      ? loadFullStoryUserId({ getCurrentUser: security.authc.getCurrentUser })
      : Promise.resolve(undefined);

    // We need to call FS.identify synchronously after FullStory is initialized, so we must load the user upfront
    const [{ initializeFullStory }, userId] = await Promise.all([
      fullStoryChunkPromise,
      userIdPromise,
    ]);

    const { fullStory, sha256 } = initializeFullStory({
      basePath,
      orgId,
      packageInfo: this.initializerContext.env.packageInfo,
    });

    // Very defensive try/catch to avoid any UnhandledPromiseRejections
    try {
      // This needs to be called syncronously to be sure that we populate the user ID soon enough to make sessions merging
      // across domains work
      if (userId) {
        // Do the hashing here to keep it at clear as possible in our source code that we do not send literal user IDs
        const hashedId = sha256(userId.toString());
        application
          ?.then(async () => {
            const appStart = await application;
            this.appSubscription = appStart.currentAppId$.subscribe((appId) => {
              // Update the current application every time it changes
              fullStory.setUserVars({
                app_id_str: appId ?? 'unknown',
              });
            });
          })
          .catch((e) => {
            // eslint-disable-next-line no-console
            console.error(
              `[cloud.full_story] Could not retrieve application service due to error: ${e.toString()}`,
              e
            );
          });
        const kibanaVer = this.initializerContext.env.packageInfo.version;
        // TODO: use semver instead
        const parsedVer = (kibanaVer.indexOf('.') > -1 ? kibanaVer.split('.') : []).map((s) =>
          parseInt(s, 10)
        );
        // `str` suffix is required for evn vars, see docs: https://help.fullstory.com/hc/en-us/articles/360020623234
        fullStory.identify(hashedId, {
          version_str: kibanaVer,
          version_major_int: parsedVer[0] ?? -1,
          version_minor_int: parsedVer[1] ?? -1,
          version_patch_int: parsedVer[2] ?? -1,
        });
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(
        `[cloud.full_story] Could not call FS.identify due to error: ${e.toString()}`,
        e
      );
    }

    // Get performance information from the browser (non standard property
    const memoryInfo = mapKeys(
      // @ts-expect-error
      window.performance.memory || {},
      (_, key) => `${snakeCase(key)}_int`
    );
    // Record an event that Kibana was opened so we can easily search for sessions that use Kibana
    fullStory.event('Loaded Kibana', {
      // `str` suffix is required, see docs: https://help.fullstory.com/hc/en-us/articles/360020623234
      kibana_version_str: this.initializerContext.env.packageInfo.version,
      ...memoryInfo,
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
