/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import { toMountPoint, wrapWithTheme } from '@kbn/kibana-react-plugin/public';
import { extractInfluencers } from '../../../common/util/job_utils';
import { VIEW_BY_JOB_LABEL } from '../../application/explorer/explorer_constants';
import { AnomalySwimlaneInitializer } from './anomaly_swimlane_initializer';
import { getDefaultSwimlanePanelTitle } from './anomaly_swimlane_embeddable';
import { HttpService } from '../../application/services/http_service';
import type { AnomalySwimlaneEmbeddableInput } from '..';
import { resolveJobSelection } from '../common/resolve_job_selection';
import { mlApiServicesProvider } from '../../application/services/ml_api_service';

export async function resolveAnomalySwimlaneUserInput(
  coreStart: CoreStart,
  input?: AnomalySwimlaneEmbeddableInput
): Promise<Partial<AnomalySwimlaneEmbeddableInput>> {
  const { http, overlays } = coreStart;

  const { getJobs } = mlApiServicesProvider(new HttpService(http));

  return new Promise(async (resolve, reject) => {
    try {
      const { jobIds } = await resolveJobSelection(coreStart, input?.jobIds);
      const title = input?.title ?? getDefaultSwimlanePanelTitle(jobIds);
      const { jobs } = await getJobs({ jobId: jobIds.join(',') });
      const influencers = extractInfluencers(jobs);
      influencers.push(VIEW_BY_JOB_LABEL);
      const { theme$ } = coreStart.theme;
      const modalSession = overlays.openModal(
        toMountPoint(
          wrapWithTheme(
            <AnomalySwimlaneInitializer
              defaultTitle={title}
              influencers={influencers}
              initialInput={input}
              onCreate={(explicitInput) => {
                modalSession.close();
                resolve({
                  jobIds,
                  title: explicitInput.panelTitle,
                  ...explicitInput,
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
