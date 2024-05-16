/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import { tracksOverlays } from '@kbn/presentation-containers';
import { extractInfluencers } from '../../../common/util/job_utils';
import { VIEW_BY_JOB_LABEL } from '../../application/explorer/explorer_constants';
import { HttpService } from '../../application/services/http_service';
import type { AnomalyChartsEmbeddableInput, AnomalyChartsEmbeddableState } from '..';
import { resolveJobSelection } from '../common/resolve_job_selection';
import { AnomalyChartsInitializer } from './anomaly_charts_initializer';
import { mlApiServicesProvider } from '../../application/services/ml_api_service';
import { getDefaultExplorerChartsPanelTitle } from './utils';

export async function resolveEmbeddableAnomalyChartsUserInput(
  coreStart: CoreStart,
  dataViews: DataViewsContract,
  parentApi: unknown,
  focusedPanelId: string,
  input?: Partial<Pick<AnomalyChartsEmbeddableInput, 'title' | 'jobIds' | 'maxSeriesToPlot'>>
): Promise<Pick<AnomalyChartsEmbeddableState, 'jobIds' | 'title' | 'maxSeriesToPlot'>> {
  const { http, overlays, ...startServices } = coreStart;

  const { getJobs } = mlApiServicesProvider(new HttpService(http));

  return new Promise(async (resolve, reject) => {
    try {
      const { jobIds } = await resolveJobSelection(
        coreStart,
        dataViews,
        input?.jobIds,
        false,
        true
      );
      const title = input?.title ?? getDefaultExplorerChartsPanelTitle(jobIds);
      const { jobs } = await getJobs({ jobId: jobIds.join(',') });
      const influencers = extractInfluencers(jobs);
      influencers.push(VIEW_BY_JOB_LABEL);
      const overlayTracker = tracksOverlays(parentApi) ? parentApi : undefined;

      const flyoutSession = overlays.openFlyout(
        toMountPoint(
          <AnomalyChartsInitializer
            defaultTitle={title}
            initialInput={input}
            onCreate={({ panelTitle, maxSeriesToPlot }) => {
              resolve({
                jobIds,
                title: panelTitle,
                panelTitle,
                maxSeriesToPlot,
              } as Pick<AnomalyChartsEmbeddableState, 'jobIds' | 'title' | 'maxSeriesToPlot'>);
              flyoutSession.close();
              overlayTracker?.clearOverlays();
            }}
            onCancel={() => {
              reject();
              flyoutSession.close();
              overlayTracker?.clearOverlays();
            }}
          />,
          startServices
        ),
        {
          // @todo: match width of this and flyout from resolveJobSelection
          type: 'push',
          ownFocus: true,
          size: 's',
          onClose: () => {
            reject();
            flyoutSession.close();
            overlayTracker?.clearOverlays();
          },
        }
      );
      if (tracksOverlays(parentApi)) {
        parentApi.openOverlay(flyoutSession, {
          focusedPanelId,
        });
      }
    } catch (error) {
      reject(error);
    }
  });
}
