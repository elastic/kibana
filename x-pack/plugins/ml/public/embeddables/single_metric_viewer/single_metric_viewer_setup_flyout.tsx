/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { distinctUntilChanged, from, skip, takeUntil } from 'rxjs';
import type { CoreStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { SingleMetricViewerEmbeddableUserInput, SingleMetricViewerEmbeddableInput } from '..';
import { SingleMetricViewerInitializer } from './single_metric_viewer_initializer';
import type { MlApiServices } from '../../application/services/ml_api_service';

export async function resolveEmbeddableSingleMetricViewerUserInput(
  coreStart: CoreStart,
  services: { data: DataPublicPluginStart; share?: SharePluginStart },
  mlApiServices: MlApiServices,
  input?: Partial<SingleMetricViewerEmbeddableInput>
): Promise<SingleMetricViewerEmbeddableUserInput> {
  const {
    http,
    overlays,
    application: { currentLocation$ },
    ...startServices
  } = coreStart;
  const { data, share } = services;
  const timefilter = data.query.timefilter.timefilter;

  return new Promise(async (resolve, reject) => {
    try {
      const flyoutSession = overlays.openFlyout(
        toMountPoint(
          <KibanaContextProvider
            services={{
              mlServices: { mlApiServices },
              data,
              share,
              ...coreStart,
            }}
          >
            <SingleMetricViewerInitializer
              data-test-subj="mlSingleMetricViewerEmbeddableInitializer"
              mlApiServices={mlApiServices}
              bounds={timefilter.getBounds()!}
              initialInput={input}
              onCreate={(explicitInput) => {
                flyoutSession.close();
                resolve(explicitInput);
              }}
              onCancel={() => {
                flyoutSession.close();
                reject();
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
            flyoutSession.close();
            reject();
          },
        }
      );
      // Close the flyout when user navigates out of the current plugin
      currentLocation$
        .pipe(skip(1), takeUntil(from(flyoutSession.onClose)), distinctUntilChanged())
        .subscribe(() => {
          flyoutSession.close();
        });
    } catch (error) {
      reject(error);
    }
  });
}
