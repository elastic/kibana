/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { DataPublicPluginStart, TimefilterContract } from '@kbn/data-plugin/public';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import type { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import {
  type CategorizationType,
  QuickCategorizationJobCreator,
  CATEGORIZATION_TYPE,
} from './quick_create_job';
import type { MlApi } from '../../../services/ml_api_service';
import type { MlJobService } from '../../../services/job_service';

import { getDefaultDatafeedQuery, getRisonValue } from '../utils/new_job_utils';

interface Dependencies {
  kibanaConfig: IUiSettingsClient;
  timeFilter: TimefilterContract;
  dashboardService: DashboardStart;
  data: DataPublicPluginStart;
  mlApi: MlApi;
  mlJobService: MlJobService;
}
export async function resolver(
  deps: Dependencies,
  categorizationTypeRisonString: string,
  dataViewIdRisonString: string,
  fieldRisonString: string,
  partitionFieldRisonString: string | null,
  stopOnWarnRisonString: string,
  fromRisonString: string,
  toRisonString: string,
  queryRisonString: string
) {
  const { mlApi, mlJobService, timeFilter, kibanaConfig, dashboardService, data } = deps;

  const query = getRisonValue<QueryDslQueryContainer>(queryRisonString, getDefaultDatafeedQuery());
  const from = getRisonValue<string>(fromRisonString, '');
  const to = getRisonValue<string>(toRisonString, '');
  const categorizationType = getRisonValue<CategorizationType>(
    categorizationTypeRisonString,
    CATEGORIZATION_TYPE.COUNT
  );
  const dataViewId = getRisonValue<string>(dataViewIdRisonString, '');
  const field = getRisonValue<string>(fieldRisonString, '');
  const partitionField =
    partitionFieldRisonString === null ? '' : getRisonValue<string>(partitionFieldRisonString, '');
  const stopOnWarn = getRisonValue<boolean>(stopOnWarnRisonString, false);

  const jobCreator = new QuickCategorizationJobCreator(
    data.dataViews,
    kibanaConfig,
    timeFilter,
    dashboardService,
    data,
    mlApi,
    mlJobService
  );
  await jobCreator.createAndStashADJob(
    categorizationType,
    dataViewId,
    field,
    partitionField,
    stopOnWarn,
    from,
    to,
    query
  );
}
