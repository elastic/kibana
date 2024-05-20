/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreStart } from '@kbn/core/public';
import { tracksOverlays } from '@kbn/presentation-containers';
import { toMountPoint } from '@kbn/react-kibana-mount';
import React from 'react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { FieldStatisticsInitializer } from './field_stats_initializer';
import type { ChangePointEmbeddableState } from './types';
import type { DataVisualizerStartDependencies } from '../../../common/types/data_visualizer_plugin';

// const FieldStatisticsInitializer = dynamic(() => import('./field_stats_initializer'));

export async function resolveEmbeddableFieldStatsUserInput(
  coreStart: CoreStart,
  pluginStart: DataVisualizerStartDependencies,
  parentApi: unknown,
  focusedPanelId: string,
  input?: ChangePointEmbeddableState
): Promise<ChangePointEmbeddableState> {
  const { overlays } = coreStart;

  const overlayTracker = tracksOverlays(parentApi) ? parentApi : undefined;
  const services = {
    ...coreStart,
    ...pluginStart,
  };
  return new Promise(async (resolve, reject) => {
    try {
      const flyoutSession = overlays.openFlyout(
        toMountPoint(
          <KibanaContextProvider services={services}>
            <FieldStatisticsInitializer
              initialInput={input}
              onCreate={(update) => {
                resolve(update);

                if (update?.dataViewId !== input?.dataViewId) {
                  // @TODO: remove
                  console.log(`--@@needto reset`);
                }

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
          coreStart
        ),
        {
          ownFocus: true,
          size: 's',
          type: 'push',
          'data-test-subj': 'fieldStatisticsInitializerFlyout',
          onClose: () => {
            reject();
            flyoutSession.close();
            overlayTracker?.clearOverlays();
          },
        }
      );

      if (tracksOverlays(parentApi)) {
        parentApi.openOverlay(flyoutSession, { focusedPanelId });
      }
    } catch (error) {
      reject(error);
    }
  });
}
