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
import type { AiopsAppDependencies } from '../..';
import { AiopsAppContext } from '../../hooks/use_aiops_app_context';
import type { AiopsPluginStartDeps } from '../../types';
import { LogRateAnalysisEmbeddableInitializer } from './log_rate_analysis_initializer';
import type { LogRateAnalysisComponentApi, LogRateAnalysisEmbeddableState } from './types';

export async function resolveEmbeddableLogRateAnalysisUserInput(
  coreStart: CoreStart,
  pluginStart: AiopsPluginStartDeps,
  parentApi: unknown,
  focusedPanelId: string,
  isNewPanel: boolean,
  logRateAnalysisControlsApi: LogRateAnalysisComponentApi,
  deletePanel?: () => void,
  initialState?: LogRateAnalysisEmbeddableState
): Promise<LogRateAnalysisEmbeddableState> {
  const { overlays } = coreStart;

  const overlayTracker = tracksOverlays(parentApi) ? parentApi : undefined;

  let hasChanged = false;
  return new Promise(async (resolve, reject) => {
    try {
      const cancelChanges = () => {
        if (isNewPanel && deletePanel) {
          deletePanel();
        } else if (hasChanged && logRateAnalysisControlsApi && initialState) {
          // Reset to initialState in case user has changed the preview state
          logRateAnalysisControlsApi.updateUserInput(initialState);
        }

        flyoutSession.close();
        overlayTracker?.clearOverlays();
      };

      const update = async (nextUpdate: LogRateAnalysisEmbeddableState) => {
        resolve(nextUpdate);
        flyoutSession.close();
        overlayTracker?.clearOverlays();
      };

      const preview = async (nextUpdate: LogRateAnalysisEmbeddableState) => {
        if (logRateAnalysisControlsApi) {
          logRateAnalysisControlsApi.updateUserInput(nextUpdate);
          hasChanged = true;
        }
      };

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
            <LogRateAnalysisEmbeddableInitializer
              initialInput={initialState}
              onCreate={update}
              onCancel={cancelChanges}
              onPreview={preview}
              isNewPanel={isNewPanel}
            />
          </AiopsAppContext.Provider>,
          coreStart
        ),
        {
          ownFocus: true,
          size: 's',
          type: 'push',
          paddingSize: 'm',
          hideCloseButton: true,
          'data-test-subj': 'aiopsLogRateAnalysisEmbeddableInitializer',
          'aria-labelledby': 'logRateAnalysisConfig',
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
