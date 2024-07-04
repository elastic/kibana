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
import { PatternAnalysisEmbeddableInitializer } from './pattern_analysis_initializer';
import type { PatternAnalysisEmbeddableState } from './types';

export async function resolveEmbeddablePatternAnalysisUserInput(
  coreStart: CoreStart,
  pluginStart: AiopsPluginStartDeps,
  parentApi: unknown,
  focusedPanelId: string,
  isNewPanel: boolean,
  input?: PatternAnalysisEmbeddableState
): Promise<PatternAnalysisEmbeddableState> {
  const { overlays } = coreStart;

  const overlayTracker = tracksOverlays(parentApi) ? parentApi : undefined;

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
            <PatternAnalysisEmbeddableInitializer
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
              isNewPanel={isNewPanel}
            />
          </AiopsAppContext.Provider>,
          coreStart
        ),
        {
          ownFocus: true,
          size: 's',
          type: 'push',
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
