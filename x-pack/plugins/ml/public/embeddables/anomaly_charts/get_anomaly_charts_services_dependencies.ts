/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreStart } from '@kbn/core/public';
import { HttpService } from '../../application/services/http_service';
import type { MlStartDependencies } from '../../plugin';
import type { MlDependencies } from '../../application/app';
import type { AnomalyChartsEmbeddableServices } from '..';
import { AnomalyExplorerChartsService } from '../../application/services/anomaly_explorer_charts_service';

export const getAnomalyChartsServiceDependencies = async (
  coreStartServices: CoreStart,
  pluginsStartServices: MlStartDependencies
): Promise<AnomalyChartsEmbeddableServices> => {
  const [
    { AnomalyDetectorService },
    { fieldFormatServiceFactory },
    { indexServiceFactory },
    { mlApiServicesProvider },
    { mlResultsServiceProvider },
  ] = await Promise.all([
    await import('../../application/services/anomaly_detector_service'),
    await import('../../application/services/field_format_service_factory'),
    await import('../../application/util/index_service'),
    await import('../../application/services/ml_api_service'),
    await import('../../application/services/results_service'),
  ]);
  const httpService = new HttpService(coreStartServices.http);
  const anomalyDetectorService = new AnomalyDetectorService(httpService);
  const mlApiServices = mlApiServicesProvider(httpService);
  const mlResultsService = mlResultsServiceProvider(mlApiServices);
  const anomalyExplorerService = new AnomalyExplorerChartsService(
    pluginsStartServices.data.query.timefilter.timefilter,
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
  const mlIndexUtils = indexServiceFactory(pluginsStartServices.data.dataViews);
  const mlFieldFormatService = fieldFormatServiceFactory(mlApiServices, mlIndexUtils);

  const anomalyChartsEmbeddableServices: AnomalyChartsEmbeddableServices = [
    coreStartServices,
    pluginsStartServices as MlDependencies,
    {
      anomalyDetectorService,
      anomalyExplorerService,
      mlFieldFormatService,
      mlResultsService,
    },
  ];
  return anomalyChartsEmbeddableServices;
};
