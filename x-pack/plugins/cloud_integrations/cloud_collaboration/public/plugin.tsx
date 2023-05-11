/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { CordProvider } from '@cord-sdk/react';
import useObservable from 'react-use/lib/useObservable';

import { CoreStart, CoreSetup, Plugin } from '@kbn/core/public';
import { HttpSetup } from '@kbn/core-http-browser';
import { BreadcrumbPresence } from '@kbn/cloud-collaboration-presence';

import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import {
  CloudCollaborationPluginSetup,
  CloudCollaborationPluginSetupDependencies,
  CloudCollaborationPluginStart,
  CloudCollaborationPluginStartDependencies,
} from './types';
import type { GetCollaborationTokenDataResponseBody } from '../common';
import { PATH_GET_TOKEN } from '../common';

interface SetupDeps extends CloudCollaborationPluginSetupDependencies {
  http: HttpSetup;
}

export class CloudCollaborationPlugin
  implements
    Plugin<
      CloudCollaborationPluginSetup,
      CloudCollaborationPluginStart,
      CloudCollaborationPluginSetupDependencies,
      CloudCollaborationPluginStartDependencies
    >
{
  private token$ = new BehaviorSubject<string | null>(null);
  private isAvailable$ = new BehaviorSubject<boolean>(false);

  public setup(
    core: CoreSetup,
    { cloud, security }: CloudCollaborationPluginSetupDependencies
  ): CloudCollaborationPluginSetup {
    this.setupCollaboration({ http: core.http, cloud, security }).catch((e) =>
      // eslint-disable-next-line no-console
      console.debug(`Error setting up collaboration: ${e.toString()}`)
    );

    return {};
  }

  public start({
    chrome: { setBreadcrumbsAppendExtension },
  }: CoreStart): CloudCollaborationPluginStart {
    const setBreadcrumbPresence = (application: string, savedObjectId: string) => {
      const Presence = () => {
        const token = useObservable(this.token$);
        return (
          <CordProvider clientAuthToken={token}>
            <BreadcrumbPresence {...{ application, savedObjectId }} />
          </CordProvider>
        );
      };

      setBreadcrumbsAppendExtension({
        content: toMountPoint(<Presence />),
      });
    };

    const clearBreadcrumbPresence = () => {
      setBreadcrumbsAppendExtension({
        content: toMountPoint(<></>),
      });
    };

    return {
      getIsAvailable$: () => this.isAvailable$,
      getToken$: () => this.token$,
      setBreadcrumbPresence,
      clearBreadcrumbPresence,
    };
  }

  public stop() {}

  private async setupCollaboration({ cloud, http, security }: SetupDeps) {
    const { isCloudEnabled } = cloud;

    if (!security || !isCloudEnabled) {
      return;
    }

    try {
      const { token } = await http.get<GetCollaborationTokenDataResponseBody>(PATH_GET_TOKEN);

      if (!token) {
        return;
      }

      this.token$.next(token);
      this.isAvailable$.next(true);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.debug(
        `[cloud.collaboration] Could not retrieve collaboration token: ${e.response.status} ${e.message}`,
        e
      );
    }
  }
}
