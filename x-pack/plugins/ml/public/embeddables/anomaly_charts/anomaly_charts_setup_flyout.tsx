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
import { extractInfluencers } from '../../../common/util/job_utils';
import { VIEW_BY_JOB_LABEL } from '../../application/explorer/explorer_constants';
import { getDefaultExplorerChartsPanelTitle } from './anomaly_charts_embeddable';
import { HttpService } from '../../application/services/http_service';
import type { AnomalyChartsEmbeddableInput } from '..';
import { resolveJobSelection } from '../common/resolve_job_selection';
import { AnomalyChartsInitializer } from './anomaly_charts_initializer';
import { mlApiServicesProvider } from '../../application/services/ml_api_service';

export async function resolveEmbeddableAnomalyChartsUserInput(
  coreStart: CoreStart,
  dataViews: DataViewsContract,
  input?: AnomalyChartsEmbeddableInput
): Promise<Partial<AnomalyChartsEmbeddableInput>> {
  const { http, overlays, theme, i18n } = coreStart;

  const { getJobs } = mlApiServicesProvider(new HttpService(http));

  return new Promise(async (resolve, reject) => {
    try {
      const { jobIds } = await resolveJobSelection(coreStart, dataViews, input?.jobIds);
      const title = input?.title ?? getDefaultExplorerChartsPanelTitle(jobIds);
      const { jobs } = await getJobs({ jobId: jobIds.join(',') });
      const influencers = extractInfluencers(jobs);
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
          />,
          { theme, i18n }
        )
      );
    } catch (error) {
      reject(error);
    }
  });
}
