/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart } from '../../../../../../src/core/public/types';
import { toMountPoint } from '../../../../../../src/plugins/kibana_react/public/util/to_mount_point';
import { VIEW_BY_JOB_LABEL } from '../../application/explorer/explorer_constants';
import { AnomalyDetectorService } from '../../application/services/anomaly_detector_service';
import { HttpService } from '../../application/services/http_service';
import { resolveJobSelection } from '../common/resolve_job_selection';
import type { AnomalyChartsEmbeddableInput } from '../types';
import { getDefaultExplorerChartsPanelTitle } from './anomaly_charts_embeddable';
import { AnomalyChartsInitializer } from './anomaly_charts_initializer';

export async function resolveEmbeddableAnomalyChartsUserInput(
  coreStart: CoreStart,
  input?: AnomalyChartsEmbeddableInput
): Promise<Partial<AnomalyChartsEmbeddableInput>> {
  const { http, overlays } = coreStart;

  const anomalyDetectorService = new AnomalyDetectorService(new HttpService(http));

  return new Promise(async (resolve, reject) => {
    const { jobIds } = await resolveJobSelection(coreStart, input?.jobIds);

    const title = input?.title ?? getDefaultExplorerChartsPanelTitle(jobIds);
    const jobs = await anomalyDetectorService.getJobs$(jobIds).toPromise();
    const influencers = anomalyDetectorService.extractInfluencers(jobs);
    influencers.push(VIEW_BY_JOB_LABEL);

    const modalSession = overlays.openModal(
      toMountPoint(
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
        />
      )
    );
  });
}
