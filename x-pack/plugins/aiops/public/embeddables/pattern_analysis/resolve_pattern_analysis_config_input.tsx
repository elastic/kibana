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
import { AiopsAppContext } from '../../hooks/use_aiops_app_context';
import type { AiopsPluginStartDeps } from '../../types';
import { PatternAnalysisEmbeddableInitializer } from './pattern_analysis_initializer';
import type { PatternAnalysisComponentApi, PatternAnalysisEmbeddableState } from './types';

export async function resolveEmbeddablePatternAnalysisUserInput(
  coreStart: CoreStart,
  pluginStart: AiopsPluginStartDeps,
  parentApi: unknown,
  focusedPanelId: string,
  isNewPanel: boolean,
  patternAnalysisControlsApi: PatternAnalysisComponentApi,
  deletePanel?: () => void,
  initialState?: PatternAnalysisEmbeddableState
): Promise<PatternAnalysisEmbeddableState> {
  const { overlays } = coreStart;

  const overlayTracker = tracksOverlays(parentApi) ? parentApi : undefined;

  let hasChanged = false;
  return new Promise(async (resolve, reject) => {
    try {
      const cancelChanges = () => {
        if (isNewPanel && deletePanel) {
          deletePanel();
        } else if (hasChanged && patternAnalysisControlsApi && initialState) {
          // Reset to initialState in case user has changed the preview state
          patternAnalysisControlsApi.updateUserInput(initialState);
        }

        flyoutSession.close();
        overlayTracker?.clearOverlays();
      };

      const update = async (nextUpdate: PatternAnalysisEmbeddableState) => {
        resolve(nextUpdate);
        flyoutSession.close();
        overlayTracker?.clearOverlays();
      };

      const preview = async (nextUpdate: PatternAnalysisEmbeddableState) => {
        if (patternAnalysisControlsApi) {
          patternAnalysisControlsApi.updateUserInput(nextUpdate);
          hasChanged = true;
        }
      };

      const flyoutSession = overlays.openFlyout(
        toMountPoint(
          <AiopsAppContext.Provider
            value={{
              embeddingOrigin: 'flyout',
              ...coreStart,
              ...pluginStart,
            }}
          >
            <PatternAnalysisEmbeddableInitializer
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
          'data-test-subj': 'aiopsPatternAnalysisEmbeddableInitializer',
          'aria-labelledby': 'patternAnalysisConfig',
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
