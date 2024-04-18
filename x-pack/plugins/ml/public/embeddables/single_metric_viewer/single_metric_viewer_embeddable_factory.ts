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
import type { SingleMetricViewerEmbeddableInput, SingleMetricViewerEmbeddableServices } from '..';
import { ANOMALY_SINGLE_METRIC_VIEWER_EMBEDDABLE_TYPE } from '..';
import type { MlPluginStart, MlStartDependencies } from '../../plugin';
import type { MlDependencies } from '../../application/app';
import { HttpService } from '../../application/services/http_service';
import { AnomalyExplorerChartsService } from '../../application/services/anomaly_explorer_charts_service';
import type { ISingleMetricViewerEmbeddable } from './single_metric_viewer_embeddable';

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
      const userInput = await resolveEmbeddableSingleMetricViewerUserInput(
        coreStart,
        pluginStart,
        singleMetricServices.mlApiServices
      );

      return {
        ...userInput,
        title: userInput.panelTitle,
      };
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
      { mlJobServiceFactory },
      { mlResultsServiceProvider },
      { MlCapabilitiesService },
      { timeSeriesSearchServiceFactory },
      { toastNotificationServiceProvider },
    ] = await Promise.all([
      await this.getStartServices(),
      await import('../../application/services/anomaly_detector_service'),
      await import('../../application/services/field_format_service_factory'),
      await import('../../application/util/index_service'),
      await import('../../application/services/ml_api_service'),
      await import('../../application/services/job_service'),
      await import('../../application/services/results_service'),
      await import('../../application/capabilities/check_capabilities'),
      await import(
        '../../application/timeseriesexplorer/timeseriesexplorer_utils/time_series_search_service'
      ),
      await import('../../application/services/toast_notification_service'),
    ]);

    const httpService = new HttpService(coreStart.http);
    const anomalyDetectorService = new AnomalyDetectorService(httpService);
    const mlApiServices = mlApiServicesProvider(httpService);
    const mlJobService = mlJobServiceFactory(
      toastNotificationServiceProvider(coreStart.notifications.toasts),
      mlApiServices
    );
    const mlResultsService = mlResultsServiceProvider(mlApiServices);
    const mlTimeSeriesSearchService = timeSeriesSearchServiceFactory(
      mlResultsService,
      mlApiServices
    );
    const mlCapabilities = new MlCapabilitiesService(mlApiServices);
    const anomalyExplorerService = new AnomalyExplorerChartsService(
      pluginsStart.data.query.timefilter.timefilter,
      mlApiServices,
      mlResultsService
    );

    // Note on the following services:
    // - `mlIndexUtils` is just instantiated here to be passed on to `mlFieldFormatService`,
    //   but it's not being made available as part of global services. Since it's just
    //   some stateless utils `useMlIndexUtils()` should be used from within components.
    // - `mlFieldFormatService` is a stateful legacy service that relied on "dependency cache",
    //   so because of its own state it needs to be made available as a global service.
    //   In the long run we should again try to get rid of it here and make it available via
    //   its own context or possibly without having a singleton like state at all, since the
    //   way this manages its own state right now doesn't consider React component lifecycles.
    const mlIndexUtils = indexServiceFactory(pluginsStart.data.dataViews);
    const mlFieldFormatService = fieldFormatServiceFactory(mlApiServices, mlIndexUtils);

    return [
      coreStart,
      pluginsStart as MlDependencies,
      {
        anomalyDetectorService,
        anomalyExplorerService,
        mlApiServices,
        mlCapabilities,
        mlFieldFormatService,
        mlJobService,
        mlResultsService,
        mlTimeSeriesSearchService,
      },
    ];
  }

  public async create(
    initialInput: SingleMetricViewerEmbeddableInput,
    parent?: IContainer
  ): Promise<InstanceType<ISingleMetricViewerEmbeddable>> {
    const services = await this.getServices();
    const { SingleMetricViewerEmbeddable } = await import('./single_metric_viewer_embeddable');
    return new SingleMetricViewerEmbeddable(initialInput, services, parent);
  }
}
