/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import type {
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
  HttpStart,
  IBasePath,
  AnalyticsServiceSetup,
} from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import useObservable from 'react-use/lib/useObservable';
import { BehaviorSubject, catchError, from, map, of } from 'rxjs';

import type { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/public';
import { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import { Sha256 } from '@kbn/core/public/utils';
import { registerCloudDeploymentIdAnalyticsContext } from '../common/register_cloud_deployment_id_analytics_context';
import { getIsCloudEnabled } from '../common/is_cloud_enabled';
import {
  ELASTIC_SUPPORT_LINK,
  CLOUD_SNAPSHOTS_PATH,
  GET_CHAT_USER_DATA_ROUTE_PATH,
} from '../common/constants';
import type { GetChatUserDataResponseBody } from '../common/types';
import { createUserMenuLinks } from './user_menu_links';
import { getFullCloudUrl } from './utils';
import { ChatConfig, ServicesProvider } from './services';

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
    eventTypesAllowlist?: string[];
  };
  /** Configuration to enable live chat in Cloud-enabled instances of Kibana. */
  chat: {
    /** Determines if chat is enabled. */
    enabled: boolean;
    /** The URL to the remotely-hosted chat application. */
    chatURL: string;
  };
}

interface CloudSetupDependencies {
  home?: HomePublicPluginSetup;
  security?: Pick<SecurityPluginSetup, 'authc'>;
}

interface CloudStartDependencies {
  security?: SecurityPluginStart;
}

export interface CloudStart {
  /**
   * A React component that provides a pre-wired `React.Context` which connects components to Cloud services.
   */
  CloudContextProvider: FC<{}>;
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

interface SetupFullStoryDeps {
  analytics: AnalyticsServiceSetup;
  basePath: IBasePath;
}

interface SetupChatDeps extends Pick<CloudSetupDependencies, 'security'> {
  http: CoreSetup['http'];
}

export class CloudPlugin implements Plugin<CloudSetup> {
  private readonly config: CloudConfigType;
  private isCloudEnabled: boolean;
  private chatConfig$ = new BehaviorSubject<ChatConfig>({ enabled: false });

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.config = this.initializerContext.config.get<CloudConfigType>();
    this.isCloudEnabled = false;
  }

  public setup(core: CoreSetup, { home, security }: CloudSetupDependencies) {
    this.setupTelemetryContext(core.analytics, security, this.config.id);

    this.setupFullStory({ analytics: core.analytics, basePath: core.http.basePath }).catch((e) =>
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

    this.setupChat({ http: core.http, security }).catch((e) =>
      // eslint-disable-next-line no-console
      console.debug(`Error setting up Chat: ${e.toString()}`)
    );

    if (home) {
      home.environment.update({ cloud: this.isCloudEnabled });
      if (this.isCloudEnabled) {
        home.tutorials.setVariable('cloud', { id, baseUrl, profileUrl, deploymentUrl });
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

  public start(coreStart: CoreStart, { security }: CloudStartDependencies): CloudStart {
    const { deployment_url: deploymentUrl, base_url: baseUrl } = this.config;
    coreStart.chrome.setHelpSupportUrl(ELASTIC_SUPPORT_LINK);

    const setLinks = (authorized: boolean) => {
      if (!authorized) return;

      if (baseUrl && deploymentUrl) {
        coreStart.chrome.setCustomNavLink({
          title: i18n.translate('xpack.cloud.deploymentLinkLabel', {
            defaultMessage: 'Manage this deployment',
          }),
          euiIconType: 'logoCloud',
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

    // There's a risk that the request for chat config will take too much time to complete, and the provider
    // will maintain a stale value.  To avoid this, we'll use an Observable.
    const CloudContextProvider: FC = ({ children }) => {
      const chatConfig = useObservable(this.chatConfig$, { enabled: false });
      return <ServicesProvider chat={chatConfig}>{children}</ServicesProvider>;
    };

    return {
      CloudContextProvider,
    };
  }

  public stop() {}

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

  /**
   * If the right config is provided, register the FullStory shipper to the analytics client.
   * @param analytics Core's Analytics service's setup contract.
   * @param basePath Core's http.basePath helper.
   * @private
   */
  private async setupFullStory({ analytics, basePath }: SetupFullStoryDeps) {
    const { enabled, org_id: fullStoryOrgId, eventTypesAllowlist } = this.config.full_story;
    if (!enabled || !fullStoryOrgId) {
      return; // do not load any FullStory code in the browser if not enabled
    }

    // Keep this import async so that we do not load any FullStory code into the browser when it is disabled.
    const { FullStoryShipper } = await import('@kbn/analytics-shippers-fullstory');
    analytics.registerShipper(FullStoryShipper, {
      eventTypesAllowlist,
      fullStoryOrgId,
      // Load an Elastic-internally audited script. Ideally, it should be hosted on a CDN.
      scriptUrl: basePath.prepend(
        `/internal/cloud/${this.initializerContext.env.packageInfo.buildNum}/fullstory.js`
      ),
      namespace: 'FSKibana',
    });
  }

  /**
   * Set up the Analytics context providers.
   * @param analytics Core's Analytics service. The Setup contract.
   * @param security The security plugin.
   * @param cloudId The Cloud Org ID.
   * @private
   */
  private setupTelemetryContext(
    analytics: AnalyticsServiceSetup,
    security?: Pick<SecurityPluginSetup, 'authc'>,
    cloudId?: string
  ) {
    registerCloudDeploymentIdAnalyticsContext(analytics, cloudId);

    if (security) {
      analytics.registerContextProvider({
        name: 'cloud_user_id',
        context$: from(security.authc.getCurrentUser()).pipe(
          map((user) => {
            if (user.elastic_cloud_user) {
              // If the user is managed by ESS, use the plain username as the user ID:
              // The username is expected to be unique for these users,
              // and it matches how users are identified in the Cloud UI, so it allows us to correlate them.
              return { userId: user.username, isElasticCloudUser: true };
            }

            return {
              // For the rest of the authentication providers, we want to add the cloud deployment ID to make it unique.
              // Especially in the case of Elasticsearch-backed authentication, where users are commonly repeated
              // across multiple deployments (i.e.: `elastic` superuser).
              userId: cloudId ? `${cloudId}:${user.username}` : user.username,
              isElasticCloudUser: false,
            };
          }),
          // The hashing here is to keep it at clear as possible in our source code that we do not send literal user IDs
          map(({ userId, isElasticCloudUser }) => ({ userId: sha256(userId), isElasticCloudUser })),
          catchError(() => of({ userId: undefined, isElasticCloudUser: false }))
        ),
        schema: {
          userId: {
            type: 'keyword',
            _meta: { description: 'The user id scoped as seen by Cloud (hashed)' },
          },
          isElasticCloudUser: {
            type: 'boolean',
            _meta: {
              description: '`true` if the user is managed by ESS.',
            },
          },
        },
      });
    }
  }

  private async setupChat({ http, security }: SetupChatDeps) {
    if (!this.isCloudEnabled) {
      return;
    }

    const { enabled, chatURL } = this.config.chat;

    if (!security || !enabled || !chatURL) {
      return;
    }

    try {
      const {
        email,
        id,
        token: jwt,
      } = await http.get<GetChatUserDataResponseBody>(GET_CHAT_USER_DATA_ROUTE_PATH);

      if (!email || !id || !jwt) {
        return;
      }

      this.chatConfig$.next({
        enabled,
        chatURL,
        user: {
          email,
          id,
          jwt,
        },
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.debug(`[cloud.chat] Could not retrieve chat config: ${e.res.status} ${e.message}`, e);
    }
  }
}

function sha256(str: string) {
  return new Sha256().update(str, 'utf8').digest('hex');
}
