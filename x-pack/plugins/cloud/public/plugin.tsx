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
  ExecutionContextStart,
  AnalyticsServiceSetup,
} from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import useObservable from 'react-use/lib/useObservable';
import { BehaviorSubject, from, of, Subscription } from 'rxjs';
import { exhaustMap, filter, map } from 'rxjs/operators';
import { compact } from 'lodash';

import type {
  AuthenticatedUser,
  SecurityPluginSetup,
  SecurityPluginStart,
} from '@kbn/security-plugin/public';
import { HomePublicPluginSetup } from '@kbn/home-plugin/public';
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
interface SetupTelemetryContextDeps extends CloudSetupDependencies {
  analytics: AnalyticsServiceSetup;
  executionContextPromise: Promise<ExecutionContextStart>;
  esOrgId?: string;
}

interface SetupChatDeps extends Pick<CloudSetupDependencies, 'security'> {
  http: CoreSetup['http'];
}

export class CloudPlugin implements Plugin<CloudSetup> {
  private readonly config: CloudConfigType;
  private isCloudEnabled: boolean;
  private appSubscription?: Subscription;
  private chatConfig$ = new BehaviorSubject<ChatConfig>({ enabled: false });

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.config = this.initializerContext.config.get<CloudConfigType>();
    this.isCloudEnabled = false;
  }

  public setup(core: CoreSetup, { home, security }: CloudSetupDependencies) {
    const executionContextPromise = core.getStartServices().then(([coreStart]) => {
      return coreStart.executionContext;
    });

    this.setupTelemetryContext({
      analytics: core.analytics,
      security,
      executionContextPromise,
      esOrgId: this.config.id,
    }).catch((e) => {
      // eslint-disable-next-line no-console
      console.debug(`Error setting up TelemetryContext: ${e.toString()}`);
    });

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

  /**
   * If the right config is provided, register the FullStory shipper to the analytics client.
   * @param analytics Core's Analytics service's setup contract.
   * @param basePath Core's http.basePath helper.
   * @private
   */
  private async setupFullStory({ analytics, basePath }: SetupFullStoryDeps) {
    const { enabled, org_id: fullStoryOrgId } = this.config.full_story;
    if (!enabled || !fullStoryOrgId) {
      return; // do not load any FullStory code in the browser if not enabled
    }

    // Keep this import async so that we do not load any FullStory code into the browser when it is disabled.
    const { FullStoryShipper } = await import('@kbn/analytics-shippers-fullstory');
    analytics.registerShipper(FullStoryShipper, {
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
   * @param executionContextPromise Core's executionContext's start contract.
   * @param esOrgId The Cloud Org ID.
   * @private
   */
  private async setupTelemetryContext({
    analytics,
    security,
    executionContextPromise,
    esOrgId,
  }: SetupTelemetryContextDeps) {
    // Some context providers can be moved to other places for better domain isolation.
    // Let's use https://github.com/elastic/kibana/issues/125690 for that purpose.
    analytics.registerContextProvider({
      name: 'kibana_version',
      context$: of({ version: this.initializerContext.env.packageInfo.version }),
      schema: { version: { type: 'keyword', _meta: { description: 'The version of Kibana' } } },
    });

    analytics.registerContextProvider({
      name: 'cloud_org_id',
      context$: of({ esOrgId }),
      schema: {
        esOrgId: {
          type: 'keyword',
          _meta: { description: 'The Cloud Organization ID', optional: true },
        },
      },
    });

    // This needs to be called synchronously to be sure that we populate the user ID soon enough to make sessions merging
    // across domains work
    if (security) {
      analytics.registerContextProvider({
        name: 'cloud_user_id',
        context$: from(loadUserId({ getCurrentUser: security.authc.getCurrentUser })).pipe(
          filter((userId): userId is string => Boolean(userId)),
          exhaustMap(async (userId) => {
            const { sha256 } = await import('js-sha256');
            // Join the cloud org id and the user to create a truly unique user id.
            // The hashing here is to keep it at clear as possible in our source code that we do not send literal user IDs
            return { userId: sha256(esOrgId ? `${esOrgId}:${userId}` : `${userId}`) };
          })
        ),
        schema: {
          userId: {
            type: 'keyword',
            _meta: { description: 'The user id scoped as seen by Cloud (hashed)' },
          },
        },
      });
    }

    const executionContext = await executionContextPromise;
    analytics.registerContextProvider({
      name: 'execution_context',
      context$: executionContext.context$.pipe(
        // Update the current context every time it changes
        map(({ name, page, id }) => ({
          pageName: `${compact([name, page]).join(':')}`,
          applicationId: name ?? 'unknown',
          page,
          entityId: id,
        }))
      ),
      schema: {
        pageName: {
          type: 'keyword',
          _meta: { description: 'The name of the current page' },
        },
        page: {
          type: 'keyword',
          _meta: { description: 'The current page', optional: true },
        },
        applicationId: {
          type: 'keyword',
          _meta: { description: 'The id of the current application' },
        },
        entityId: {
          type: 'keyword',
          _meta: {
            description:
              'The id of the current entity (dashboard, visualization, canvas, lens, etc)',
            optional: true,
          },
        },
      },
    });

    analytics.registerEventType({
      eventType: 'Loaded Kibana',
      schema: {
        kibana_version: {
          type: 'keyword',
          _meta: { description: 'The version of Kibana', optional: true },
        },
        memory_js_heap_size_limit: {
          type: 'long',
          _meta: { description: 'The maximum size of the heap', optional: true },
        },
        memory_js_heap_size_total: {
          type: 'long',
          _meta: { description: 'The total size of the heap', optional: true },
        },
        memory_js_heap_size_used: {
          type: 'long',
          _meta: { description: 'The used size of the heap', optional: true },
        },
      },
    });

    // Get performance information from the browser (non standard property
    // @ts-expect-error 2339
    const memory = window.performance.memory;
    let memoryInfo = {};
    if (memory) {
      memoryInfo = {
        memory_js_heap_size_limit: memory.jsHeapSizeLimit,
        memory_js_heap_size_total: memory.totalJSHeapSize,
        memory_js_heap_size_used: memory.usedJSHeapSize,
      };
    }

    analytics.reportEvent('Loaded Kibana', {
      kibana_version: this.initializerContext.env.packageInfo.version,
      ...memoryInfo,
    });
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

/** @internal exported for testing */
export const loadUserId = async ({
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
        `[cloud.analytics] username not specified. User metadata: ${JSON.stringify(
          currentUser.metadata
        )}`
      );
    }

    return currentUser.username;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`[cloud.analytics] Error loading the current user: ${e.toString()}`, e);
    return undefined;
  }
};
