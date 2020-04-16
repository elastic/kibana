/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import { CoreStart } from 'kibana/public';

import {
  IContainer,
  EmbeddableFactoryDefinition,
} from '../../../../../../src/plugins/embeddable/public';
import {
  AnomalySwimlaneEmbeddable,
  AnomalySwimlaneEmbeddableInput,
  ANOMALY_SWIMLANE_EMBEDDABLE_TYPE,
} from './anomaly_swimlane_embaddable';
import { toMountPoint } from '../../../../../../src/plugins/kibana_react/public';
import { AnomalySwimlaneInitializer } from './anomaly_swimlane_initializer';

export class AnomalySwimlaneEmbeddableFactory
  implements EmbeddableFactoryDefinition<AnomalySwimlaneEmbeddableInput> {
  public readonly type = ANOMALY_SWIMLANE_EMBEDDABLE_TYPE;

  private overlays: CoreStart['overlays'] | undefined = undefined;

  constructor() {}

  public setDependencies(overlays: CoreStart['overlays']) {
    this.overlays = overlays;
  }

  public async isEditable() {
    return true;
  }

  public getDisplayName() {
    return i18n.translate('xpack.ml.components.jobAnomalyScoreEmbeddable.displayName', {
      defaultMessage: 'ML Anomaly Swimlane',
    });
  }

  public async getExplicitInput(): Promise<Partial<AnomalySwimlaneEmbeddableInput>> {
    return new Promise(resolve => {
      if (this.overlays === undefined) {
        throw new Error('overlays service is not initialized');
      }

      const modalSession = this.overlays.openModal(
        toMountPoint(
          <AnomalySwimlaneInitializer
            onCancel={() => {
              modalSession.close();
              resolve(undefined);
            }}
            onCreate={(swimlaneProps: { jobId: string; viewBy: string }) => {
              modalSession.close();
              resolve(swimlaneProps);
            }}
          />
        ),
        {
          'data-test-subj': 'mlAnomalySwimlaneEmbeddable',
        }
      );
    });
  }

  public async create(initialInput: AnomalySwimlaneEmbeddableInput, parent?: IContainer) {
    return new AnomalySwimlaneEmbeddable(initialInput, parent);
  }
}
