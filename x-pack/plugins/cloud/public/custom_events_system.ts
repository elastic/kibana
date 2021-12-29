/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { customEvents } from '@kbn/custom-events';
import {
  CoreSetup,
  CoreStart,
  IBasePath,
  PackageInfo,
  PluginInitializerContext,
} from 'kibana/public';
import { Subscription } from 'rxjs';
import {
  AuthenticatedUser,
  AuthenticationServiceStart,
} from '../../../../node_modules/x-pack/plugins/security/public';
import { CloudConfigType } from '.';

/**
 * This is the entry point used to boot the frontend when serving a application
 * that lives in the Kibana Platform.
 */

interface StartDeps {
  authc?: AuthenticationServiceStart;
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
    this.enabled = config.full_story.enabled;
  }

  async setup(coreSetup: CoreSetup) {
    if (!this.enabled) return;

    this.basePath = coreSetup.http.basePath;
  }

  async start(coreStart: CoreStart, start: StartDeps) {
    if (!this.enabled || !start) return;

    const { authc } = start;

    this.setupCustomEventReporting(coreStart, { authc }).catch((e) =>
      // eslint-disable-next-line no-console
      console.debug(`Error setting up FullStory: ${e.toString()}`)
    );
  }

  private async setupCustomEventReporting(coreStart: CoreStart, { authc }: StartDeps) {
    const { enabled, org_id: orgId } = this.config.full_story;

    if (!enabled || !orgId) {
      return; // do not load any fullstory code in the browser if not enabled
    }
    // Very defensive try/catch to avoid any UnhandledPromiseRejections
    try {
      const userIdPromise: Promise<string | undefined> = authc
        ? loadUserId({ getCurrentUser: authc.getCurrentUser })
        : Promise.resolve(undefined);

      const initSuccess = await customEvents.initialize({
        orgId,
        enabled,
        userIdPromise,
        basePath: this.basePath,
        packageInfo: this.packageInfo,
      });

      // This needs to be called syncronously to be sure that we populate the user ID soon enough to make sessions merging
      // across domains work
      if (initSuccess) {
        const { application } = coreStart;
        this.appSubscription = application?.currentAppId$.subscribe((appId) => {
          // Update the current application every time it changes
          customEvents.setCustomEventContext({ appId: appId || 'unknown' });
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
