/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

import { StartServicesAccessor } from 'kibana/public';

import {
  EmbeddableFactoryDefinition,
  IContainer,
} from '../../../../../../src/plugins/embeddable/public';
import { HttpService } from '../../application/services/http_service';
import { MlPluginStart, MlStartDependencies } from '../../plugin';
import { MlDependencies } from '../../application/app';
import {
  ANOMALY_SWIMLANE_EMBEDDABLE_TYPE,
  AnomalySwimlaneEmbeddableInput,
  AnomalySwimlaneEmbeddableServices,
} from '..';

export class AnomalySwimlaneEmbeddableFactory
  implements EmbeddableFactoryDefinition<AnomalySwimlaneEmbeddableInput> {
  public readonly type = ANOMALY_SWIMLANE_EMBEDDABLE_TYPE;

  constructor(
    private getStartServices: StartServicesAccessor<MlStartDependencies, MlPluginStart>
  ) {}

  public async isEditable() {
    return true;
  }

  public getDisplayName() {
    return i18n.translate('xpack.ml.components.jobAnomalyScoreEmbeddable.displayName', {
      defaultMessage: 'ML Anomaly Swim Lane',
    });
  }

  public async getExplicitInput(): Promise<Partial<AnomalySwimlaneEmbeddableInput>> {
    const [coreStart] = await this.getServices();

    try {
      const { resolveAnomalySwimlaneUserInput } = await import('./anomaly_swimlane_setup_flyout');
      return await resolveAnomalySwimlaneUserInput(coreStart);
    } catch (e) {
      return Promise.reject();
    }
  }

  private async getServices(): Promise<AnomalySwimlaneEmbeddableServices> {
    const [coreStart, pluginsStart] = await this.getStartServices();

    const { AnomalyDetectorService } = await import(
      '../../application/services/anomaly_detector_service'
    );
    const { AnomalyTimelineService } = await import(
      '../../application/services/anomaly_timeline_service'
    );
    const { mlApiServicesProvider } = await import('../../application/services/ml_api_service');
    const { mlResultsServiceProvider } = await import('../../application/services/results_service');

    const httpService = new HttpService(coreStart.http);
    const anomalyDetectorService = new AnomalyDetectorService(httpService);
    const anomalyTimelineService = new AnomalyTimelineService(
      pluginsStart.data.query.timefilter.timefilter,
      coreStart.uiSettings,
      mlResultsServiceProvider(mlApiServicesProvider(httpService))
    );

    return [
      coreStart,
      pluginsStart as MlDependencies,
      { anomalyDetectorService, anomalyTimelineService },
    ];
  }

  public async create(
    initialInput: AnomalySwimlaneEmbeddableInput,
    parent?: IContainer
  ): Promise<any> {
    const services = await this.getServices();
    const { AnomalySwimlaneEmbeddable } = await import('./anomaly_swimlane_embeddable');
    return new AnomalySwimlaneEmbeddable(initialInput, services, parent);
  }
}
