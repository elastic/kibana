/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { StartServicesAccessor } from 'kibana/public';

import type {
  EmbeddableFactoryDefinition,
  IContainer,
} from '../../../../../../src/plugins/embeddable/public';
import { HttpService } from '../../application/services/http_service';
import type { MlPluginStart, MlStartDependencies } from '../../plugin';
import type { MlDependencies } from '../../application/app';
import {
  ANOMALY_EXPLORER_CHARTS_EMBEDDABLE_TYPE,
  AnomalyExplorerEmbeddableInput,
  AnomalyExplorerEmbeddableServices,
} from '..';
import { AnomalyExplorerChartsService } from '../../application/services/anomaly_explorer_charts_service';

export class AnomalyExplorerEmbeddableFactory
  implements EmbeddableFactoryDefinition<AnomalyExplorerEmbeddableInput> {
  public readonly type = ANOMALY_EXPLORER_CHARTS_EMBEDDABLE_TYPE;

  constructor(
    private getStartServices: StartServicesAccessor<MlStartDependencies, MlPluginStart>
  ) {}

  public async isEditable() {
    return true;
  }

  public getDisplayName() {
    return i18n.translate('xpack.ml.components.mlAnomalyExplorerEmbeddable.displayName', {
      defaultMessage: 'ML Anomaly Explorer',
    });
  }

  public async getExplicitInput(): Promise<Partial<AnomalyExplorerEmbeddableInput>> {
    const [coreStart] = await this.getServices();

    try {
      const { resolveAnomalyExplorerUserInput } = await import('./anomaly_explorer_setup_flyout');
      return await resolveAnomalyExplorerUserInput(coreStart);
    } catch (e) {
      return Promise.reject();
    }
  }

  private async getServices(): Promise<AnomalyExplorerEmbeddableServices> {
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
    const mlApiServices = mlApiServicesProvider(httpService);
    const mlResultsService = mlResultsServiceProvider(mlApiServices);

    const anomalyTimelineService = new AnomalyTimelineService(
      pluginsStart.data.query.timefilter.timefilter,
      coreStart.uiSettings,
      mlResultsService
    );
    const anomalyExplorerService = new AnomalyExplorerChartsService(
      pluginsStart.data.query.timefilter.timefilter,
      mlApiServices,
      mlResultsService
    );

    return [
      coreStart,
      pluginsStart as MlDependencies,
      { anomalyDetectorService, anomalyTimelineService, anomalyExplorerService, mlResultsService },
    ];
  }

  public async create(
    initialInput: AnomalyExplorerEmbeddableInput,
    parent?: IContainer
  ): Promise<any> {
    const services = await this.getServices();
    const { AnomalyExplorerEmbeddable } = await import('./anomaly_explorer_embeddable');
    return new AnomalyExplorerEmbeddable(initialInput, services, parent);
  }
}
