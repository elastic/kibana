/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { takeUntil } from 'rxjs/operators';
import { from } from 'rxjs';
import type { Embeddable } from '@kbn/lens-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';

import {
  toMountPoint,
  wrapWithTheme,
  KibanaContextProvider,
} from '@kbn/kibana-react-plugin/public';
import { DashboardConstants } from '@kbn/dashboard-plugin/public';
import { getMlGlobalServices } from '../../application/app';
import { LensLayerSelectionFlyout } from './lens_vis_layer_selection_flyout';

import {
  getResultLayersFromEmbeddable,
  convertLensToADJob,
} from '../../application/jobs/new_job/job_from_lens';

export async function showLensVisToADJobFlyout(
  embeddable: Embeddable,
  coreStart: CoreStart,
  share: SharePluginStart,
  data: DataPublicPluginStart,
  lens: LensPublicStart
): Promise<void> {
  const {
    http,
    theme: { theme$ },
    overlays,
    application: { currentAppId$ },
  } = coreStart;

  return new Promise(async (resolve, reject) => {
    try {
      // do not show the flyout if the results only contain one layer
      // and that layer can be used for creating an AD job
      const layerResults = await getResultLayersFromEmbeddable(embeddable, data.dataViews, lens);
      if (layerResults.length === 1 && layerResults[0].isCompatible) {
        convertLensToADJob(embeddable, share, 0);
        return resolve();
      }

      const onFlyoutClose = () => {
        flyoutSession.close();
        resolve();
      };

      const flyoutSession = overlays.openFlyout(
        toMountPoint(
          wrapWithTheme(
            <KibanaContextProvider
              services={{ ...coreStart, mlServices: getMlGlobalServices(http) }}
            >
              <LensLayerSelectionFlyout
                embeddable={embeddable}
                onClose={() => {
                  onFlyoutClose();
                  resolve();
                }}
                layerResults={layerResults}
                share={share}
              />
            </KibanaContextProvider>,
            theme$
          )
        ),
        {
          'data-test-subj': 'mlFlyoutLensLayerSelector',
          ownFocus: true,
          closeButtonAriaLabel: 'jobSelectorFlyout',
          onClose: onFlyoutClose,
          // @ts-expect-error should take any number/string compatible with the CSS width attribute
          size: '35vw',
        }
      );

      // Close the flyout when user navigates out of the dashboard plugin
      currentAppId$.pipe(takeUntil(from(flyoutSession.onClose))).subscribe((appId) => {
        if (appId !== DashboardConstants.DASHBOARDS_ID) {
          flyoutSession.close();
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}
