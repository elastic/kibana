/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { IUiSettingsClient, OverlayStart } from 'kibana/public';
import moment from 'moment';
import { VIEW_BY_JOB_LABEL } from '../../application/explorer/explorer_constants';
import { toMountPoint } from '../../../../../../src/plugins/kibana_react/public';
import { AnomalySwimlaneInitializer } from './anomaly_swimlane_initializer';
import { JobSelectorFlyout } from '../../application/components/job_selector/job_selector_flyout';
import { AnomalyDetectorService } from '../../application/services/anomaly_detector_service';
import { getInitialGroupsMap } from '../../application/components/job_selector/job_selector';
import {
  AnomalySwimlaneEmbeddableInput,
  getDefaultPanelTitle,
} from './anomaly_swimlane_embeddable';

export async function resolveAnomalySwimlaneUserInput(
  {
    overlays,
    anomalyDetectorService,
    uiSettings,
  }: {
    anomalyDetectorService: AnomalyDetectorService;
    overlays: OverlayStart;
    uiSettings: IUiSettingsClient;
  },
  input?: AnomalySwimlaneEmbeddableInput
): Promise<Partial<AnomalySwimlaneEmbeddableInput>> {
  return new Promise(async (resolve, reject) => {
    const maps = {
      groupsMap: getInitialGroupsMap([]),
      jobsMap: {},
    };

    const tzConfig = uiSettings.get('dateFormat:tz');
    const dateFormatTz = tzConfig !== 'Browser' ? tzConfig : moment.tz.guess();

    const selectedIds = input?.jobIds;

    const flyoutSession = overlays.openFlyout(
      toMountPoint(
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
                  onCreate={({ panelTitle, viewBy, swimlaneType, limit }) => {
                    modalSession.close();
                    resolve({ jobIds, title: panelTitle, swimlaneType, viewBy, limit });
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
      ),
      {
        'data-test-subj': 'mlAnomalySwimlaneEmbeddable',
      }
    );
  });
}
