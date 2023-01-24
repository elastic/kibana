/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { StartServicesAccessor } from '@kbn/core/public';

import type { EmbeddableFactoryDefinition, IContainer } from '@kbn/embeddable-plugin/public';
import { PLUGIN_ICON, PLUGIN_ID, ML_APP_NAME } from '../../../common/constants/app';
import { HttpService } from '../../application/services/http_service';
import type { MlPluginStart, MlStartDependencies } from '../../plugin';
import type { MlDependencies } from '../../application/app';
import {
  ANOMALY_EXPLORER_CHARTS_EMBEDDABLE_TYPE,
  AnomalyChartsEmbeddableInput,
  AnomalyChartsEmbeddableServices,
} from '..';
import { AnomalyExplorerChartsService } from '../../application/services/anomaly_explorer_charts_service';

export class AnomalyChartsEmbeddableFactory
  implements EmbeddableFactoryDefinition<AnomalyChartsEmbeddableInput>
{
  public readonly type = ANOMALY_EXPLORER_CHARTS_EMBEDDABLE_TYPE;

  public readonly grouping = [
    {
      id: PLUGIN_ID,
      getDisplayName: () => ML_APP_NAME,
      getIconType: () => PLUGIN_ICON,
    },
  ];

  constructor(
    private getStartServices: StartServicesAccessor<MlStartDependencies, MlPluginStart>
  ) {}

  public async isEditable() {
    return true;
  }

  public getDisplayName() {
    return i18n.translate('xpack.ml.components.mlAnomalyExplorerEmbeddable.displayName', {
      defaultMessage: 'Anomaly chart',
    });
  }

  public getDescription() {
    return i18n.translate('xpack.ml.components.mlAnomalyExplorerEmbeddable.description', {
      defaultMessage: 'View anomaly detection results in a chart.',
    });
  }

  public async getExplicitInput(): Promise<Partial<AnomalyChartsEmbeddableInput>> {
    const [coreStart] = await this.getServices();

    try {
      const { resolveEmbeddableAnomalyChartsUserInput } = await import(
        './anomaly_charts_setup_flyout'
      );
      return await resolveEmbeddableAnomalyChartsUserInput(coreStart);
    } catch (e) {
      return Promise.reject();
    }
  }

  private async getServices(): Promise<AnomalyChartsEmbeddableServices> {
    const [coreStart, pluginsStart] = await this.getStartServices();

    const { AnomalyDetectorService } = await import(
      '../../application/services/anomaly_detector_service'
    );
    const { mlApiServicesProvider } = await import('../../application/services/ml_api_service');
    const { mlResultsServiceProvider } = await import('../../application/services/results_service');

    const httpService = new HttpService(coreStart.http);
    const anomalyDetectorService = new AnomalyDetectorService(httpService);
    const mlApiServices = mlApiServicesProvider(httpService);
    const mlResultsService = mlResultsServiceProvider(mlApiServices);

    const anomalyExplorerService = new AnomalyExplorerChartsService(
      pluginsStart.data.query.timefilter.timefilter,
      mlApiServices,
      mlResultsService
    );

    return [
      coreStart,
      pluginsStart as MlDependencies,
      { anomalyDetectorService, anomalyExplorerService, mlResultsService },
    ];
  }

  public async create(initialInput: AnomalyChartsEmbeddableInput, parent?: IContainer) {
    const services = await this.getServices();
    const { AnomalyChartsEmbeddable } = await import('./anomaly_charts_embeddable');
    return new AnomalyChartsEmbeddable(initialInput, services, parent);
  }
}
