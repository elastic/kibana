/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import rison from '@kbn/rison';
import type { Query } from '@kbn/es-query';
import type { Filter } from '@kbn/es-query';
import type { LensPublicStart, LensSavedObjectAttributes } from '@kbn/lens-plugin/public';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import { QuickLensJobCreator } from './quick_create_job';
import type { MlApiServices } from '../../../services/ml_api_service';

import { getDefaultQuery, getRisonValue } from '../utils/new_job_utils';

interface Dependencies {
  lens: LensPublicStart;
  dataViews: DataViewsContract;
  kibanaConfig: IUiSettingsClient;
  timeFilter: TimefilterContract;
  dashboardService: DashboardStart;
  mlApiServices: MlApiServices;
}
export async function resolver(
  deps: Dependencies,
  lensSavedObjectRisonString: string | undefined,
  fromRisonString: string,
  toRisonString: string,
  queryRisonString: string,
  filtersRisonString: string,
  layerIndexRisonString: string
) {
  const { dataViews, lens, mlApiServices, timeFilter, kibanaConfig, dashboardService } = deps;
  if (lensSavedObjectRisonString === undefined) {
    throw new Error('Cannot create visualization');
  }
  const vis = rison.decode(lensSavedObjectRisonString) as unknown as LensSavedObjectAttributes;

  if (!vis) {
    throw new Error('Cannot create visualization');
  }

  const query = getRisonValue<Query>(queryRisonString, getDefaultQuery()) as Query;
  const filters = getRisonValue<Filter[]>(filtersRisonString, []);
  const from = getRisonValue<string>(fromRisonString, '');
  const to = getRisonValue<string>(toRisonString, '');
  const layerIndex = getRisonValue<number | undefined>(layerIndexRisonString, undefined);

  const jobCreator = new QuickLensJobCreator(
    lens,
    dataViews,
    kibanaConfig,
    timeFilter,
    dashboardService,
    mlApiServices
  );
  await jobCreator.createAndStashADJob(vis, from, to, query, filters, layerIndex);
}
