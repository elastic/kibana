/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import { StartServicesAccessor } from 'kibana/public';

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
import { AnomalySwimlaneInitializer } from './anomaly_swimlane_initializer';
import { MlStartDependencies } from '../../plugin';

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
      const { overlays } = (await this.getStartServices())[0];

      const modalSession = overlays.openModal(
        toMountPoint(
          <AnomalySwimlaneInitializer
            onCancel={() => {
              modalSession.close();
              resolve(undefined);
            }}
            onCreate={(swimlaneProps: { jobId: string; viewBy: string }) => {
              resolve(swimlaneProps);
              modalSession.close();
            }}
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
