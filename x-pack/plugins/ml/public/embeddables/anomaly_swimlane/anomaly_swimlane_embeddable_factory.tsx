/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import { StartServicesAccessor } from 'kibana/public';

import moment from 'moment';
import {
  IContainer,
  EmbeddableFactoryDefinition,
  ErrorEmbeddable,
} from '../../../../../../src/plugins/embeddable/public';
import {
  AnomalySwimlaneEmbeddable,
  AnomalySwimlaneEmbeddableInput,
  ANOMALY_SWIMLANE_EMBEDDABLE_TYPE,
  AnomalySwimlaneEmbeddableServices,
} from './anomaly_swimlane_embeddable';
import { toMountPoint } from '../../../../../../src/plugins/kibana_react/public';
import { MlStartDependencies } from '../../plugin';
import { JobSelectorFlyout } from '../../application/components/job_selector/job_selector_flyout';
import { getInitialGroupsMap } from '../../application/components/job_selector/job_selector';
import { HttpService } from '../../application/services/http_service';
import { MlAnomalyDetectorService } from '../../application/services/ml_anomanly_detector.service';
import { AnomalySwimlaneInitializer } from './anomaly_swimlane_initializer';
import { SWIMLANE_TYPE, VIEW_BY_JOB_LABEL } from '../../application/explorer/explorer_constants';
import { ExplorerService } from '../../application/services/explorer.service';
import { mlResultsService } from '../../application/services/results_service';

export class AnomalySwimlaneEmbeddableFactory
  implements EmbeddableFactoryDefinition<AnomalySwimlaneEmbeddableInput> {
  public readonly type = ANOMALY_SWIMLANE_EMBEDDABLE_TYPE;

  constructor(private getStartServices: StartServicesAccessor<MlStartDependencies>) {}

  public async isEditable() {
    return false;
  }

  public getDisplayName() {
    return i18n.translate('xpack.ml.components.jobAnomalyScoreEmbeddable.displayName', {
      defaultMessage: 'ML Anomaly Swimlane',
    });
  }

  public async getExplicitInput(): Promise<Partial<AnomalySwimlaneEmbeddableInput>> {
    const services = await this.getServices();

    return new Promise(async (resolve, reject) => {
      const [{ overlays, uiSettings }, , { mlAnomalyDetectorService }] = services;

      const maps = {
        groupsMap: getInitialGroupsMap([]),
        jobsMap: {},
      };

      const tzConfig = uiSettings.get('dateFormat:tz');
      const dateFormatTz = tzConfig !== 'Browser' ? tzConfig : moment.tz.guess();

      const flyoutSession = overlays.openFlyout(
        toMountPoint(
          <JobSelectorFlyout
            dateFormatTz={dateFormatTz}
            singleSelection={false}
            timeseriesOnly={true}
            onFlyoutClose={() => {
              flyoutSession.close();
              reject();
            }}
            onSelectionConfirmed={async ({ jobIds, groups }) => {
              flyoutSession.close();

              const title = i18n.translate('xpack.ml.swimlaneEmbeddable.title', {
                defaultMessage: 'ML anomaly swimlane for {jobIds}',
                values: { jobIds: jobIds.join(', ') },
              });

              const jobs = await mlAnomalyDetectorService.getJobs$(jobIds).toPromise();

              const influencers = mlAnomalyDetectorService.extractInfluencers(jobs);

              // only one job selected with no influencers, hence no need to
              // bother the user with swimlane type selection, set to Overall
              if (jobs.length === 1 && influencers.length === 0) {
                resolve({ jobIds, title, swimlaneType: SWIMLANE_TYPE.OVERALL });
                return;
              }

              influencers.push(VIEW_BY_JOB_LABEL);

              const modalSession = overlays.openModal(
                toMountPoint(
                  <AnomalySwimlaneInitializer
                    influencers={influencers}
                    onCreate={({ viewBy, swimlaneType, limit }) => {
                      modalSession.close();
                      resolve({ jobIds, title, swimlaneType, viewBy, limit });
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

  private async getServices(): Promise<AnomalySwimlaneEmbeddableServices> {
    const [coreStart, pluginsStart] = await this.getStartServices();

    const httpService = new HttpService(coreStart.http);
    const mlAnomalyDetectorService = new MlAnomalyDetectorService(httpService);
    const explorerService = new ExplorerService(
      pluginsStart.data.query.timefilter.timefilter,
      coreStart.uiSettings,
      // TODO mlResultsService to use DI
      mlResultsService
    );

    return [coreStart, pluginsStart, { mlAnomalyDetectorService, explorerService }];
  }

  public async create(
    initialInput: AnomalySwimlaneEmbeddableInput,
    parent?: IContainer
  ): Promise<AnomalySwimlaneEmbeddable | ErrorEmbeddable> {
    const services = await this.getServices();
    return new AnomalySwimlaneEmbeddable(initialInput, services, parent);
  }
}
