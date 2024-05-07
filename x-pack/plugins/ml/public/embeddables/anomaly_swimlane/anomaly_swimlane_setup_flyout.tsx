/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { distinctUntilChanged, from, skip, takeUntil } from 'rxjs';
import { jobsApiProvider } from '../../application/services/ml_api_service/jobs';
import { AnomalySwimlaneInitializer } from './anomaly_swimlane_initializer';
import { HttpService } from '../../application/services/http_service';
import type { AnomalySwimLaneEmbeddableState, AnomalySwimlaneEmbeddableUserInput } from '..';

export async function resolveAnomalySwimlaneUserInput(
  coreStart: CoreStart,
  input?: Partial<AnomalySwimLaneEmbeddableState>
): Promise<AnomalySwimlaneEmbeddableUserInput> {
  const {
    http,
    overlays,
    application: { currentAppId$ },
    ...startServices
  } = coreStart;

  return new Promise(async (resolve, reject) => {
    try {
      const adJobsApiService = jobsApiProvider(new HttpService(http));

      const flyoutSession = overlays.openFlyout(
        toMountPoint(
          <KibanaContextProvider services={{ ...coreStart }}>
            <AnomalySwimlaneInitializer
              adJobsApiService={adJobsApiService}
              initialInput={input}
              onCreate={(explicitInput) => {
                flyoutSession.close();
                resolve(explicitInput);
              }}
              onCancel={() => {
                flyoutSession.close();
                reject();
              }}
            />
          </KibanaContextProvider>,
          startServices
        ),
        {
          type: 'push',
          ownFocus: true,
          size: 's',
          onClose: () => {
            flyoutSession.close();
            reject();
          },
        }
      );

      // Close the flyout when user navigates out of the current plugin
      currentAppId$
        .pipe(skip(1), takeUntil(from(flyoutSession.onClose)), distinctUntilChanged())
        .subscribe(() => {
          flyoutSession.close();
        });
    } catch (error) {
      reject(error);
    }
  });
}
