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
import { QuickLensJobCreator } from './quick_create_job';
import type { MlApiServices } from '../../../services/ml_api_service';

import { getDefaultQuery } from '../utils/new_job_utils';

interface Dependencies {
  lens: LensPublicStart;
  kibanaConfig: IUiSettingsClient;
  timeFilter: TimefilterContract;
  dashboardService: DashboardStart;
  mlApiServices: MlApiServices;
}
export async function resolver(
  deps: Dependencies,
  lensSavedObjectRisonString: string | undefined,
  fromRisonStrong: string,
  toRisonStrong: string,
  queryRisonString: string,
  filtersRisonString: string,
  layerIndexRisonString: string
) {
  const { lens, mlApiServices, timeFilter, kibanaConfig, dashboardService } = deps;
  if (lensSavedObjectRisonString === undefined) {
    throw new Error('Cannot create visualization');
  }
  const vis = rison.decode(lensSavedObjectRisonString) as unknown as LensSavedObjectAttributes;

  if (!vis) {
    throw new Error('Cannot create visualization');
  }

  let query: Query;
  let filters: Filter[];
  try {
    query = rison.decode(queryRisonString) as Query;
  } catch (error) {
    query = getDefaultQuery();
  }
  try {
    filters = rison.decode(filtersRisonString) as Filter[];
  } catch (error) {
    filters = [];
  }

  let from: string;
  let to: string;
  try {
    from = rison.decode(fromRisonStrong) as string;
  } catch (error) {
    from = '';
  }
  try {
    to = rison.decode(toRisonStrong) as string;
  } catch (error) {
    to = '';
  }
  let layerIndex: number | undefined;
  try {
    layerIndex = rison.decode(layerIndexRisonString) as number;
  } catch (error) {
    layerIndex = undefined;
  }

  const jobCreator = new QuickLensJobCreator(
    lens,
    kibanaConfig,
    timeFilter,
    dashboardService,
    mlApiServices
  );
  await jobCreator.createAndStashADJob(vis, from, to, query, filters, layerIndex);
}
