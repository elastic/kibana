/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import React from 'react';
import { apiHasParentApi } from '@kbn/presentation-publishing';
import { tracksOverlays } from '@kbn/presentation-containers';
import type { ChangePointEmbeddableApi, ChangePointEmbeddableState } from './types';
import type { AiopsAppDependencies } from '../..';
import { AiopsAppContext } from '../../hooks/use_aiops_app_context';
import type { AiopsPluginStartDeps } from '../../types';
import { ChangePointChartInitializer } from './change_point_chart_initializer';

export async function resolveEmbeddableChangePointUserInput(
  coreStart: CoreStart,
  pluginStart: AiopsPluginStartDeps,
  api: ChangePointEmbeddableApi,
  input?: ChangePointEmbeddableState
): Promise<ChangePointEmbeddableState> {
  const { overlays } = coreStart;

  const overlayTracker = tracksOverlays(api.parentApi) ? api.parentApi : undefined;

  return new Promise(async (resolve, reject) => {
    try {
      const flyoutSession = overlays.openFlyout(
        toMountPoint(
          <AiopsAppContext.Provider
            value={
              {
                ...coreStart,
                ...pluginStart,
              } as unknown as AiopsAppDependencies
            }
          >
            <ChangePointChartInitializer
              initialInput={input}
              onCreate={(update) => {
                resolve(update);
                flyoutSession.close();
                overlayTracker?.clearOverlays();
              }}
              onCancel={() => {
                reject();
                flyoutSession.close();
                overlayTracker?.clearOverlays();
              }}
            />
          </AiopsAppContext.Provider>,
          coreStart
        ),
        {
          ownFocus: true,
          size: 's',
          type: 'push',
          'data-test-subj': 'aiopsChangePointChartEmbeddableInitializer',
          'aria-labelledby': 'changePointConfig',
          onClose: () => {
            reject();
            flyoutSession.close();
            overlayTracker?.clearOverlays();
          },
        }
      );

      if (apiHasParentApi(api) && tracksOverlays(api.parentApi)) {
        api.parentApi.openOverlay(flyoutSession, { focusedPanelId: api.uuid });
      }
    } catch (error) {
      reject(error);
    }
  });
}
