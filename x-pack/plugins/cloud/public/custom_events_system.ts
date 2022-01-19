/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { customEvents } from '@kbn/custom-events';
import { CoreSetup, IBasePath, PackageInfo, PluginInitializerContext } from 'kibana/public';
import { Subscription } from 'rxjs';
import {
  AuthenticatedUser,
  AuthenticationServiceStart,
} from '../../../../x-pack/plugins/security/public';
import { CloudConfigType } from '.';

/**
 * This is the entry point used to boot the frontend when serving a application
 * that lives in the Kibana Platform.
 */

interface SetupDeps {
  authc?: AuthenticationServiceStart;
  esOrgId: string;
}

export class CustomEventsSystem {
  private readonly enabled?: boolean;
  private basePath!: IBasePath;
  private appSubscription?: Subscription;
  private packageInfo: Readonly<PackageInfo>;
  /**
   * `apmConfig` would be populated with relevant APM RUM agent
   * configuration if server is started with elastic.apm.* config.
   */
  constructor(
    initializerContext: PluginInitializerContext,
    private readonly config: CloudConfigType
  ) {
    this.packageInfo = initializerContext.env.packageInfo;
    this.enabled = config.full_story?.enabled;
  }

  setup(coreSetup: CoreSetup, deps: SetupDeps) {
    if (!this.enabled) return;

    this.basePath = coreSetup.http.basePath;

    this.setupCustomEventReporting(coreSetup, deps).catch((e) =>
      // eslint-disable-next-line no-console
      console.debug(`Error setting up FullStory: ${e.toString()}`)
    );
  }

  private async setupCustomEventReporting(coreSetup: CoreSetup, { authc, esOrgId }: SetupDeps) {
    const { enabled, org_id: fullstoryOrgId } = this.config.full_story || {};

    if (!enabled || !fullstoryOrgId) {
      return; // do not load any fullstory code in the browser if not enabled
    }
    // Very defensive try/catch to avoid any UnhandledPromiseRejections
    try {
      const applicationPromise = coreSetup.getStartServices().then(([coreStart]) => {
        return coreStart.application;
      });

      const userIdPromise: Promise<string | undefined> = authc
        ? loadUserId({ getCurrentUser: authc.getCurrentUser })
        : Promise.resolve(undefined);

      const initSuccess = await customEvents.initialize({
        fullstoryOrgId,
        esOrgId,
        enabled,
        userIdPromise,
        basePath: this.basePath,
        packageInfo: this.packageInfo,
      });

      // This needs to be called synchronously to be sure that we populate the user ID soon enough to make sessions merging
      // across domains work
      if (initSuccess) {
        const application = await applicationPromise;
        this.appSubscription = application.currentAppId$.subscribe((appId) => {
          // Update the current application every time it changes
          customEvents.setCustomEventContext({
            appId: appId || 'unknown',
          });
        });
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(`Could not call init custom events due to error: ${e.toString()}`, e);
    }

    customEvents.reportCustomEvent('kibana-loaded');
  }

  public stop() {
    this.appSubscription?.unsubscribe();
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
        `[cloud] username not specified. User metadata: ${JSON.stringify(currentUser.metadata)}`
      );
    }

    return currentUser.username;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`[cloud] Error loading the current user: ${e.toString()}`, e);
    return undefined;
  }
};
