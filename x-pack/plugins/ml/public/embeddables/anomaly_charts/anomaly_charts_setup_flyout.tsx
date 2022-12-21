/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CoreStart } from '@kbn/core/public';
import { lastValueFrom } from 'rxjs';
import { toMountPoint, wrapWithTheme } from '@kbn/kibana-react-plugin/public';
import { VIEW_BY_JOB_LABEL } from '../../application/explorer/explorer_constants';
import { AnomalyDetectorService } from '../../application/services/anomaly_detector_service';
import { getDefaultExplorerChartsPanelTitle } from './anomaly_charts_embeddable';
import { HttpService } from '../../application/services/http_service';
import { AnomalyChartsEmbeddableInput } from '..';
import { resolveJobSelection } from '../common/resolve_job_selection';
import { AnomalyChartsInitializer } from './anomaly_charts_initializer';

export async function resolveEmbeddableAnomalyChartsUserInput(
  coreStart: CoreStart,
  input?: AnomalyChartsEmbeddableInput
): Promise<Partial<AnomalyChartsEmbeddableInput>> {
  const { http, overlays } = coreStart;

  const anomalyDetectorService = new AnomalyDetectorService(new HttpService(http));

  return new Promise(async (resolve, reject) => {
    try {
      const { jobIds } = await resolveJobSelection(coreStart, input?.jobIds);
      const title = input?.title ?? getDefaultExplorerChartsPanelTitle(jobIds);
      const jobs = await lastValueFrom(anomalyDetectorService.getJobs$(jobIds));
      const influencers = anomalyDetectorService.extractInfluencers(jobs);
      influencers.push(VIEW_BY_JOB_LABEL);
      const { theme$ } = coreStart.theme;
      const modalSession = overlays.openModal(
        toMountPoint(
          wrapWithTheme(
            <AnomalyChartsInitializer
              defaultTitle={title}
              initialInput={input}
              onCreate={({ panelTitle, maxSeriesToPlot }) => {
                modalSession.close();
                resolve({
                  jobIds,
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
