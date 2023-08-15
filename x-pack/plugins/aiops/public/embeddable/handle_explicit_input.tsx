/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { toMountPoint, wrapWithTheme } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import { ChangePointChartInitializer } from './change_point_chart_initializer';
import { EmbeddableChangePointChartInput } from './embeddable_change_point_chart';

export async function resolveEmbeddableChangePointUserInput(
  coreStart: CoreStart,
  input?: EmbeddableChangePointChartInput
): Promise<Partial<EmbeddableChangePointChartInput>> {
  const { overlays } = coreStart;

  return new Promise(async (resolve, reject) => {
    try {
      const title = input?.title;
      const { theme$ } = coreStart.theme;
      const modalSession = overlays.openModal(
        toMountPoint(
          wrapWithTheme(
            <ChangePointChartInitializer
              defaultTitle={title ?? ''}
              initialInput={input}
              onCreate={({ panelTitle, maxSeriesToPlot }) => {
                modalSession.close();
                resolve({
                  title: panelTitle,
                  maxSeriesToPlot,
                });
              }}
              onCancel={() => {
                modalSession.close();
                reject();
              }}
            />,
            theme$
          )
        )
      );
    } catch (error) {
      reject(error);
    }
  });
}
