/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public'; // KibanaThemeProvider
import { getDefaultSingleMetricViewerPanelTitle } from './single_metric_viewer_embeddable';
import { HttpService } from '../../application/services/http_service';
import type { AnomalyChartsEmbeddableInput } from '..';
import { resolveJobSelection } from '../common/resolve_job_selection';
import { SingleMetricViewerInitializer } from './single_metric_viewer_initializer';
import { mlApiServicesProvider } from '../../application/services/ml_api_service';
import type { MlStartDependencies } from '../../plugin';

export async function resolveEmbeddableSingleMetricViewerUserInput(
  coreStart: CoreStart,
  pluginStart: MlStartDependencies,
  input?: AnomalyChartsEmbeddableInput
): Promise<Partial<AnomalyChartsEmbeddableInput>> {
  const { http, overlays, theme, i18n } = coreStart;
  const timefilter = pluginStart.data.query.timefilter.timefilter;

  const mlApiServices = mlApiServicesProvider(new HttpService(http));

  return new Promise(async (resolve, reject) => {
    try {
      const { jobIds } = await resolveJobSelection(coreStart, input?.jobIds, true);
      const title = input?.title ?? getDefaultSingleMetricViewerPanelTitle(jobIds);
      const { jobs } = await mlApiServices.getJobs({ jobId: jobIds.join(',') });

      const modalSession = overlays.openModal(
        toMountPoint(
          <KibanaContextProvider services={{ mlServices: { mlApiServices }, ...coreStart }}>
            <SingleMetricViewerInitializer
              defaultTitle={title}
              initialInput={input}
              job={jobs[0]}
              bounds={timefilter.getActiveBounds()!}
              onCreate={({
                functionDescription,
                panelTitle,
                selectedDetectorIndex,
                selectedEntities,
              }) => {
                modalSession.close();
                resolve({
                  jobIds,
                  title: panelTitle,
                  // @ts-ignore
                  functionDescription,
                  panelTitle,
                  selectedDetectorIndex,
                  selectedEntities,
                });
              }}
              onCancel={() => {
                modalSession.close();
                reject();
              }}
            />
          </KibanaContextProvider>,
          { theme, i18n }
        )
      );
    } catch (error) {
      reject(error);
    }
  });
}
