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
import {
  ANOMALY_SINGLE_METRIC_VIEWER_EMBEDDABLE_TYPE,
  SingleMetricViewerEmbeddableInput,
  SingleMetricViewerEmbeddableServices,
} from '..';
import type { MlPluginStart, MlStartDependencies } from '../../plugin';
import type { MlDependencies } from '../../application/app';
import { HttpService } from '../../application/services/http_service';
import { AnomalyExplorerChartsService } from '../../application/services/anomaly_explorer_charts_service';

export class SingleMetricViewerEmbeddableFactory
  implements EmbeddableFactoryDefinition<SingleMetricViewerEmbeddableInput>
{
  public readonly type = ANOMALY_SINGLE_METRIC_VIEWER_EMBEDDABLE_TYPE;

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
    return i18n.translate('xpack.ml.components.mlSingleMetricViewerEmbeddable.displayName', {
      defaultMessage: 'Single metric viewer',
    });
  }

  public getDescription() {
    return i18n.translate('xpack.ml.components.mlSingleMetricViewerEmbeddable.description', {
      defaultMessage: 'View anomaly detection single metric results in a chart.',
    });
  }

  public async getExplicitInput(): Promise<Partial<SingleMetricViewerEmbeddableInput>> {
    const [coreStart, pluginStart, singleMetricServices] = await this.getServices();

    try {
      const { resolveEmbeddableSingleMetricViewerUserInput } = await import(
        './single_metric_viewer_setup_flyout'
      );
      return await resolveEmbeddableSingleMetricViewerUserInput(
        coreStart,
        pluginStart,
        singleMetricServices
      );
    } catch (e) {
      return Promise.reject();
    }
  }

  private async getServices(): Promise<SingleMetricViewerEmbeddableServices> {
    const [
      [coreStart, pluginsStart],
      { AnomalyDetectorService },
      { fieldFormatServiceFactory },
      { indexServiceFactory },
      { mlApiServicesProvider },
      { mlResultsServiceProvider },
      { timeSeriesSearchServiceFactory },
    ] = await Promise.all([
      await this.getStartServices(),
      await import('../../application/services/anomaly_detector_service'),
      await import('../../application/services/field_format_service_factory'),
      await import('../../application/util/index_service'),
      await import('../../application/services/ml_api_service'),
      await import('../../application/services/results_service'),
      await import(
        '../../application/timeseriesexplorer/timeseriesexplorer_utils/time_series_search_service'
      ),
    ]);

    const httpService = new HttpService(coreStart.http);
    const anomalyDetectorService = new AnomalyDetectorService(httpService);
    const mlApiServices = mlApiServicesProvider(httpService);
    const mlResultsService = mlResultsServiceProvider(mlApiServices);
    const mlIndexUtils = indexServiceFactory(pluginsStart.data.dataViews);
    const mlTimeSeriesSearchService = timeSeriesSearchServiceFactory(
      mlResultsService,
      mlApiServices
    );
    const mlFieldFormatService = fieldFormatServiceFactory(mlApiServices, mlIndexUtils);

    const anomalyExplorerService = new AnomalyExplorerChartsService(
      pluginsStart.data.query.timefilter.timefilter,
      mlApiServices,
      mlResultsService
    );

    return [
      coreStart,
      pluginsStart as MlDependencies,
      {
        anomalyDetectorService,
        anomalyExplorerService,
        mlResultsService,
        mlApiServices,
        mlTimeSeriesSearchService,
        mlFieldFormatService,
      },
    ];
  }

  public async create(initialInput: SingleMetricViewerEmbeddableInput, parent?: IContainer) {
    const services = await this.getServices();
    const { SingleMetricViewerEmbeddable } = await import('./single_metric_viewer_embeddable');
    return new SingleMetricViewerEmbeddable(initialInput, services, parent);
  }
}
