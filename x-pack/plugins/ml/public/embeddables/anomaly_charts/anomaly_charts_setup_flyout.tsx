/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { tracksOverlays } from '@kbn/presentation-containers';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { HttpService } from '../../application/services/http_service';
import type { AnomalyChartsEmbeddableState } from '..';
import { AnomalyChartsInitializer } from './anomaly_charts_initializer';
import { jobsApiProvider } from '../../application/services/ml_api_service/jobs';
import { getMlGlobalServices } from '../../application/util/get_services';
import type { MlStartDependencies } from '../../plugin';

export async function resolveEmbeddableAnomalyChartsUserInput(
  coreStart: CoreStart,
  pluginStart: MlStartDependencies,
  parentApi: unknown,
  focusedPanelId: string,
  input?: Partial<Pick<AnomalyChartsEmbeddableState, 'title' | 'jobIds' | 'maxSeriesToPlot'>>
): Promise<Pick<AnomalyChartsEmbeddableState, 'jobIds' | 'title' | 'maxSeriesToPlot'>> {
  const { http, overlays, ...startServices } = coreStart;
  const adJobsApiService = jobsApiProvider(new HttpService(http));
  const mlServices = getMlGlobalServices(http, pluginStart.data.dataViews);
  const overlayTracker = tracksOverlays(parentApi) ? parentApi : undefined;

  return new Promise(async (resolve, reject) => {
    try {
      const flyoutSession = overlays.openFlyout(
        toMountPoint(
          <KibanaContextProvider services={{ ...coreStart, ...pluginStart, mlServices }}>
            <AnomalyChartsInitializer
              initialInput={input}
              onCreate={({ jobIds, title, maxSeriesToPlot }) => {
                resolve({
                  jobIds,
                  title,
                  maxSeriesToPlot,
                } as Pick<AnomalyChartsEmbeddableState, 'jobIds' | 'title' | 'maxSeriesToPlot'>);
                flyoutSession.close();
                overlayTracker?.clearOverlays();
              }}
              onCancel={() => {
                reject();
                flyoutSession.close();
                overlayTracker?.clearOverlays();
              }}
              adJobsApiService={adJobsApiService}
            />
          </KibanaContextProvider>,
          startServices
        ),
        {
          type: 'push',
          ownFocus: true,
          size: 's',
          onClose: () => {
            reject();
            flyoutSession.close();
            overlayTracker?.clearOverlays();
          },
          'data-test-subj': 'mlAnomalyChartsEmbeddableInitializer',
        }
      );
      if (tracksOverlays(parentApi)) {
        parentApi.openOverlay(flyoutSession, {
          focusedPanelId,
        });
      }
    } catch (error) {
      reject(error);
    }
  });
}
