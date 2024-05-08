/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { SingleMetricViewerEmbeddableUserInput, SingleMetricViewerEmbeddableInput } from '..';
import { resolveJobSelection } from '../common/resolve_job_selection';
import { SingleMetricViewerInitializer } from './single_metric_viewer_initializer';
import type { MlApiServices } from '../../application/services/ml_api_service';
import { getDefaultSingleMetricViewerPanelTitle } from './get_default_panel_title';

export async function resolveEmbeddableSingleMetricViewerUserInput(
  coreStart: CoreStart,
  data: DataPublicPluginStart,
  mlApiServices: MlApiServices,
  input?: Partial<SingleMetricViewerEmbeddableInput>
): Promise<Partial<SingleMetricViewerEmbeddableUserInput>> {
  const { overlays, ...startServices } = coreStart;
  const timefilter = data.query.timefilter.timefilter;

  return new Promise(async (resolve, reject) => {
    try {
      const { jobIds } = await resolveJobSelection(
        coreStart,
        data.dataViews,
        input?.jobIds ? input.jobIds : undefined,
        true
      );
      const title = input?.title ?? getDefaultSingleMetricViewerPanelTitle(jobIds[0]);
      const { jobs } = await mlApiServices.getJobs({ jobId: jobIds.join(',') });

      const modalSession = overlays.openModal(
        toMountPoint(
          <KibanaContextProvider
            services={{
              mlServices: { mlApiServices },
              ...coreStart,
            }}
          >
            <SingleMetricViewerInitializer
              bounds={timefilter.getBounds()!}
              defaultTitle={title}
              initialInput={input}
              job={jobs[0]}
              onCreate={(explicitInput) => {
                modalSession.close();
                resolve({
                  jobIds,
                  ...explicitInput,
                });
              }}
              onCancel={() => {
                modalSession.close();
                reject();
              }}
            />
          </KibanaContextProvider>,
          startServices
        )
      );
    } catch (error) {
      reject(error);
    }
  });
}
