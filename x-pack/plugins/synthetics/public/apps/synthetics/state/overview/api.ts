/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYNTHETICS_API_URLS } from '../../../../../common/constants';
import {
  MonitorOverviewResult,
  MonitorOverviewResultCodec,
} from '../../../../../common/runtime_types';
import { apiService } from '../../../../utils/api_service';

import { MonitorOverviewPageState } from './models';

export const fetchMonitorOverview = async (
  pageState: MonitorOverviewPageState
): Promise<MonitorOverviewResult> => {
  return await apiService.get(
    SYNTHETICS_API_URLS.SYNTHETICS_OVERVIEW,
    { perPage: pageState.perPage },
    MonitorOverviewResultCodec
  );
};
