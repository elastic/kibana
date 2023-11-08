/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import rison from '@kbn/rison';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { DataPublicPluginStart, TimefilterContract } from '@kbn/data-plugin/public';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import type { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import {
  type CategorizationType,
  QuickCategorizationJobCreator,
  CATEGORIZATION_TYPE,
} from './quick_create_job';
import type { MlApiServices } from '../../../services/ml_api_service';

import { getDefaultDatafeedQuery } from '../utils/new_job_utils';

interface Dependencies {
  kibanaConfig: IUiSettingsClient;
  timeFilter: TimefilterContract;
  dashboardService: DashboardStart;
  data: DataPublicPluginStart;
  mlApiServices: MlApiServices;
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
  const { mlApiServices, timeFilter, kibanaConfig, dashboardService, data } = deps;
  // if (lensSavedObjectRisonString === undefined) {
  //   throw new Error('Cannot create visualization');
  // }
  // const vis = rison.decode(lensSavedObjectRisonString) as unknown as LensSavedObjectAttributes;

  // if (!vis) {
  //   throw new Error('Cannot create visualization');
  // }

  let query: QueryDslQueryContainer;
  try {
    const queryString = rison.decode(queryRisonString) as string;
    query = JSON.parse(queryString) as QueryDslQueryContainer;
  } catch (error) {
    query = getDefaultDatafeedQuery();
  }

  let from: string;
  let to: string;
  try {
    from = rison.decode(fromRisonString) as string;
  } catch (error) {
    from = '';
  }
  try {
    to = rison.decode(toRisonString) as string;
  } catch (error) {
    to = '';
  }

  let categorizationType;
  try {
    categorizationType = rison.decode(categorizationTypeRisonString) as CategorizationType;
  } catch (error) {
    categorizationType = CATEGORIZATION_TYPE.COUNT;
  }

  let dataViewId;
  try {
    dataViewId = rison.decode(dataViewIdRisonString) as string;
  } catch (error) {
    dataViewId = '';
  }
  let field;
  try {
    field = rison.decode(fieldRisonString) as string;
  } catch (error) {
    field = '';
  }
  let partitionField;
  try {
    if (partitionFieldRisonString === null) {
      partitionField = '';
    } else {
      partitionField = rison.decode(partitionFieldRisonString) as string;
    }
  } catch (error) {
    partitionField = '';
  }

  let stopOnWarn;
  try {
    stopOnWarn = rison.decode(stopOnWarnRisonString) as boolean;
  } catch (error) {
    stopOnWarn = false;
  }

  const jobCreator = new QuickCategorizationJobCreator(
    kibanaConfig,
    timeFilter,
    dashboardService,
    data,
    mlApiServices
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
