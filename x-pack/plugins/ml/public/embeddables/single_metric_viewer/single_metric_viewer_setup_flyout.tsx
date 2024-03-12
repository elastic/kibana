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
import { getDefaultSingleMetricViewerPanelTitle } from './single_metric_viewer_embeddable';
import type { SingleMetricViewerEmbeddableInput, SingleMetricViewerServices } from '..';
import { resolveJobSelection } from '../common/resolve_job_selection';
import { SingleMetricViewerInitializer } from './single_metric_viewer_initializer';
import type { MlStartDependencies } from '../../plugin';

export async function resolveEmbeddableSingleMetricViewerUserInput(
  coreStart: CoreStart,
  pluginStart: MlStartDependencies,
  input: SingleMetricViewerServices
): Promise<Partial<SingleMetricViewerEmbeddableInput>> {
  const { overlays, theme, i18n } = coreStart;
  const { mlApiServices } = input;
  const timefilter = pluginStart.data.query.timefilter.timefilter;

  return new Promise(async (resolve, reject) => {
    try {
      const { jobIds } = await resolveJobSelection(
        coreStart,
        pluginStart.data.dataViews,
        undefined,
        true
      );
      const title = getDefaultSingleMetricViewerPanelTitle(jobIds);
      const { jobs } = await mlApiServices.getJobs({ jobId: jobIds.join(',') });

      const modalSession = overlays.openModal(
        toMountPoint(
          <KibanaContextProvider
            services={{
              mlServices: { ...input },
              ...coreStart,
            }}
          >
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
