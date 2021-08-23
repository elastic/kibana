/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CoreStart } from 'kibana/public';
import * as Rx from 'rxjs';
import { firstValueFrom } from '@kbn/std';

import { VIEW_BY_JOB_LABEL } from '../../application/explorer/explorer_constants';
import { toMountPoint } from '../../../../../../src/plugins/kibana_react/public';
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

  const create$ = new Rx.ReplaySubject<Partial<AnomalyChartsEmbeddableInput>>(1);
  const anomalyDetectorService = new AnomalyDetectorService(new HttpService(http));

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

          create$.next({
            jobIds,
            title: panelTitle,
            maxSeriesToPlot,
          });
        }}
        onCancel={() => {
          modalSession.close();
          create$.error(new Error('canceled'));
        }}
      />
    )
  );

  return await firstValueFrom(create$);
}
