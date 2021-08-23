/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import * as Rx from 'rxjs';
import { firstValueFrom } from '@kbn/std';
import { CoreStart } from 'kibana/public';
import { VIEW_BY_JOB_LABEL } from '../../application/explorer/explorer_constants';
import { toMountPoint } from '../../../../../../src/plugins/kibana_react/public';
import { AnomalySwimlaneInitializer } from './anomaly_swimlane_initializer';
import { AnomalyDetectorService } from '../../application/services/anomaly_detector_service';
import { getDefaultSwimlanePanelTitle } from './anomaly_swimlane_embeddable';
import { HttpService } from '../../application/services/http_service';
import { AnomalySwimlaneEmbeddableInput } from '..';
import { resolveJobSelection } from '../common/resolve_job_selection';

export async function resolveAnomalySwimlaneUserInput(
  coreStart: CoreStart,
  input?: AnomalySwimlaneEmbeddableInput
): Promise<Partial<AnomalySwimlaneEmbeddableInput>> {
  const { http, overlays } = coreStart;

  const anomalyDetectorService = new AnomalyDetectorService(new HttpService(http));

  const { jobIds } = await resolveJobSelection(coreStart, input?.jobIds);

  const title = input?.title ?? getDefaultSwimlanePanelTitle(jobIds);

  const jobs = await anomalyDetectorService.getJobs$(jobIds).toPromise();

  const influencers = anomalyDetectorService.extractInfluencers(jobs);
  influencers.push(VIEW_BY_JOB_LABEL);

  const onCreate$ = new Rx.ReplaySubject<Partial<AnomalySwimlaneEmbeddableInput>>(1);

  const modalSession = overlays.openModal(
    toMountPoint(
      <AnomalySwimlaneInitializer
        defaultTitle={title}
        influencers={influencers}
        initialInput={input}
        onCreate={({ panelTitle, viewBy, swimlaneType }) => {
          modalSession.close();
          onCreate$.next({ jobIds, title: panelTitle, swimlaneType, viewBy });
        }}
        onCancel={() => {
          modalSession.close();
          onCreate$.error(new Error('canceled'));
        }}
      />
    )
  );

  return await firstValueFrom(onCreate$);
}
