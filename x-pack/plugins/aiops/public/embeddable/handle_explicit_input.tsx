/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import React from 'react';
import type { EmbeddableChangePointChartExplicitInput } from './types';
import type { AiopsAppDependencies } from '..';
import { AiopsAppContext } from '../hooks/use_aiops_app_context';
import type { AiopsPluginStartDeps } from '../types';
import { ChangePointChartInitializer } from './change_point_chart_initializer';
import type { EmbeddableChangePointChartInput } from './embeddable_change_point_chart';

export async function resolveEmbeddableChangePointUserInput(
  coreStart: CoreStart,
  pluginStart: AiopsPluginStartDeps,
  input?: EmbeddableChangePointChartInput
): Promise<EmbeddableChangePointChartExplicitInput> {
  const { overlays } = coreStart;

  return new Promise(async (resolve, reject) => {
    try {
      const modalSession = overlays.openModal(
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
              onCreate={(update: EmbeddableChangePointChartExplicitInput) => {
                modalSession.close();
                resolve(update);
              }}
              onCancel={() => {
                modalSession.close();
                reject();
              }}
            />
          </AiopsAppContext.Provider>,
          { theme: coreStart.theme, i18n: coreStart.i18n }
        )
      );
    } catch (error) {
      reject(error);
    }
  });
}
