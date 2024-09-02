/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import type { MlApiServices } from '../../../services/ml_api_service';
import type { MlJobService } from '../../../services/job_service';
import { QuickGeoJobCreator } from './quick_create_job';

import { getDefaultQuery, getRisonValue } from '../utils/new_job_utils';

interface Dependencies {
  dataViews: DataViewsContract;
  kibanaConfig: IUiSettingsClient;
  timeFilter: TimefilterContract;
  dashboardService: DashboardStart;
  mlApiServices: MlApiServices;
  mlJobService: MlJobService;
}
export async function resolver(
  deps: Dependencies,
  dashboardRisonString: string,
  dataViewIdRisonString: string,
  embeddableRisonString: string,
  geoFieldRisonString: string,
  splitFieldRisonString: string,
  fromRisonString: string,
  toRisonString: string,
  layerRisonString?: string
) {
  const { dataViews, kibanaConfig, timeFilter, dashboardService, mlApiServices, mlJobService } =
    deps;
  const defaultLayer = { query: getDefaultQuery(), filters: [] };

  const dashboard = getRisonValue<typeof defaultLayer>(dashboardRisonString, defaultLayer);
  const embeddable = getRisonValue<typeof defaultLayer>(embeddableRisonString, defaultLayer);

  const layer =
    layerRisonString !== undefined
      ? getRisonValue<typeof defaultLayer>(layerRisonString, defaultLayer)
      : defaultLayer;

  const geoField = getRisonValue<string>(geoFieldRisonString, '');
  const splitField = getRisonValue<string | null>(splitFieldRisonString, null);
  const dataViewId = getRisonValue<string>(dataViewIdRisonString, '');

  const from = getRisonValue<string>(fromRisonString, '');
  const to = getRisonValue<string>(toRisonString, '');

  const jobCreator = new QuickGeoJobCreator(
    dataViews,
    kibanaConfig,
    timeFilter,
    dashboardService,
    mlApiServices,
    mlJobService
  );

  await jobCreator.createAndStashGeoJob(
    dataViewId,
    from,
    to,
    dashboard.query,
    dashboard.filters,
    embeddable.query,
    embeddable.filters,
    geoField,
    splitField,
    layer?.query
  );
}
