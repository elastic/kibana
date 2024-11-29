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
import { tracksOverlays } from '@kbn/presentation-containers';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { SingleMetricViewerEmbeddableUserInput, SingleMetricViewerEmbeddableInput } from '..';
import { SingleMetricViewerInitializer } from './single_metric_viewer_initializer';
import type { MlApi } from '../../application/services/ml_api_service';

export async function resolveEmbeddableSingleMetricViewerUserInput(
  coreStart: CoreStart,
  parentApi: unknown,
  focusedPanelId: string,
  services: { data: DataPublicPluginStart; share?: SharePluginStart },
  mlApi: MlApi,
  input?: Partial<SingleMetricViewerEmbeddableInput>
): Promise<SingleMetricViewerEmbeddableUserInput> {
  const { http, overlays, ...startServices } = coreStart;
  const { data, share } = services;
  const timefilter = data.query.timefilter.timefilter;
  const overlayTracker = tracksOverlays(parentApi) ? parentApi : undefined;

  return new Promise(async (resolve, reject) => {
    try {
      const flyoutSession = overlays.openFlyout(
        toMountPoint(
          <KibanaContextProvider
            services={{
              mlServices: { mlApi },
              data,
              share,
              ...coreStart,
            }}
          >
            <SingleMetricViewerInitializer
              data-test-subj="mlSingleMetricViewerEmbeddableInitializer"
              mlApi={mlApi}
              bounds={timefilter.getBounds()!}
              initialInput={input}
              onCreate={(explicitInput) => {
                resolve(explicitInput);
                flyoutSession.close();
                overlayTracker?.clearOverlays();
              }}
              onCancel={() => {
                reject();
                flyoutSession.close();
                overlayTracker?.clearOverlays();
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
            reject();
            flyoutSession.close();
            overlayTracker?.clearOverlays();
          },
        }
      );
      // Close the flyout when user navigates out of the current plugin
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
