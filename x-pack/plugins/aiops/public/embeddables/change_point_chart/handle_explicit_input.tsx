/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import React from 'react';
import type { ChangePointEmbeddableState } from './types';
import type { AiopsAppDependencies } from '../..';
import { AiopsAppContext } from '../../hooks/use_aiops_app_context';
import type { AiopsPluginStartDeps } from '../../types';
import { ChangePointChartInitializer } from './change_point_chart_initializer';

export async function resolveEmbeddableChangePointUserInput(
  coreStart: CoreStart,
  pluginStart: AiopsPluginStartDeps,
  input?: ChangePointEmbeddableState
): Promise<ChangePointEmbeddableState> {
  const { overlays } = coreStart;

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
                flyoutSession.close();
                resolve(update);
              }}
              onCancel={() => {
                flyoutSession.close();
                reject();
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
            flyoutSession.close();
            reject();
          },
        }
      );
    } catch (error) {
      reject(error);
    }
  });
}
