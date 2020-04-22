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
} from './anomaly_swimlane_embaddable';
import { toMountPoint } from '../../../../../../src/plugins/kibana_react/public';
import { MlStartDependencies } from '../../plugin';
import { JobSelectorFlyout } from '../../application/components/job_selector/job_selector_flyout';
import { getInitialGroupsMap } from '../../application/components/job_selector/job_selector';

export class AnomalySwimlaneEmbeddableFactory
  implements EmbeddableFactoryDefinition<AnomalySwimlaneEmbeddableInput> {
  public readonly type = ANOMALY_SWIMLANE_EMBEDDABLE_TYPE;

  constructor(private getStartServices: StartServicesAccessor<MlStartDependencies>) {}

  public async isEditable() {
    return true;
  }

  public getDisplayName() {
    return i18n.translate('xpack.ml.components.jobAnomalyScoreEmbeddable.displayName', {
      defaultMessage: 'ML Anomaly Swimlane',
    });
  }

  public async getExplicitInput(): Promise<Partial<AnomalySwimlaneEmbeddableInput>> {
    return new Promise(async resolve => {
      const [coreStart] = await this.getStartServices();
      const { overlays, uiSettings } = coreStart;

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
              resolve(undefined);
            }}
            onSelectionConfirmed={({ jobIds, groups }) => {
              const title = i18n.translate('xpack.ml.swimlaneEmbeddable.title', {
                defaultMessage: 'ML anomaly swimlane for {jobIds}',
                values: { jobIds: jobIds.join(', ') },
              });
              resolve({ jobIds, title });
              flyoutSession.close();
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

  public async create(
    initialInput: AnomalySwimlaneEmbeddableInput,
    parent?: IContainer
  ): Promise<AnomalySwimlaneEmbeddable | ErrorEmbeddable> {
    const [coreStart, pluginsStart] = await this.getStartServices();
    return new AnomalySwimlaneEmbeddable(initialInput, [coreStart, pluginsStart], parent);
  }
}
