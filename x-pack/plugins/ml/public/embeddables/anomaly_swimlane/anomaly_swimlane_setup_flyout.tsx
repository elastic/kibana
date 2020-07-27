/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { CoreStart } from 'kibana/public';
import moment from 'moment';
import { VIEW_BY_JOB_LABEL } from '../../application/explorer/explorer_constants';
import {
  KibanaContextProvider,
  toMountPoint,
} from '../../../../../../src/plugins/kibana_react/public';
import { AnomalySwimlaneInitializer } from './anomaly_swimlane_initializer';
import { JobSelectorFlyout } from '../../application/components/job_selector/job_selector_flyout';
import { AnomalyDetectorService } from '../../application/services/anomaly_detector_service';
import { getInitialGroupsMap } from '../../application/components/job_selector/job_selector';
import {
  AnomalySwimlaneEmbeddableInput,
  getDefaultPanelTitle,
} from './anomaly_swimlane_embeddable';
import { getMlGlobalServices } from '../../application/app';
import { HttpService } from '../../application/services/http_service';

export async function resolveAnomalySwimlaneUserInput(
  coreStart: CoreStart,
  input?: AnomalySwimlaneEmbeddableInput
): Promise<Partial<AnomalySwimlaneEmbeddableInput>> {
  const { http, uiSettings, overlays } = coreStart;

  const anomalyDetectorService = new AnomalyDetectorService(new HttpService(http));

  return new Promise(async (resolve, reject) => {
    const maps = {
      groupsMap: getInitialGroupsMap([]),
      jobsMap: {},
    };

    const tzConfig = uiSettings.get('dateFormat:tz');
    const dateFormatTz = tzConfig !== 'Browser' ? tzConfig : moment.tz.guess();

    const selectedIds = input?.jobIds;

    const flyoutSession = coreStart.overlays.openFlyout(
      toMountPoint(
        <KibanaContextProvider services={{ ...coreStart, mlServices: getMlGlobalServices(http) }}>
          <JobSelectorFlyout
            selectedIds={selectedIds}
            withTimeRangeSelector={false}
            dateFormatTz={dateFormatTz}
            singleSelection={false}
            timeseriesOnly={true}
            onFlyoutClose={() => {
              flyoutSession.close();
              reject();
            }}
            onSelectionConfirmed={async ({ jobIds, groups }) => {
              const title = input?.title ?? getDefaultPanelTitle(jobIds);

              const jobs = await anomalyDetectorService.getJobs$(jobIds).toPromise();

              const influencers = anomalyDetectorService.extractInfluencers(jobs);
              influencers.push(VIEW_BY_JOB_LABEL);

              await flyoutSession.close();

              const modalSession = overlays.openModal(
                toMountPoint(
                  <AnomalySwimlaneInitializer
                    defaultTitle={title}
                    influencers={influencers}
                    initialInput={input}
                    onCreate={({ panelTitle, viewBy, swimlaneType }) => {
                      modalSession.close();
                      resolve({ jobIds, title: panelTitle, swimlaneType, viewBy });
                    }}
                    onCancel={() => {
                      modalSession.close();
                      reject();
                    }}
                  />
                )
              );
            }}
            maps={maps}
          />
        </KibanaContextProvider>
      ),
      {
        'data-test-subj': 'mlAnomalySwimlaneEmbeddable',
      }
    );
  });
}
