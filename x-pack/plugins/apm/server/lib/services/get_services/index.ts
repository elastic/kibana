/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash';
import { PromiseReturnType } from '../../../../typings/common';
import {
  Setup,
  SetupTimeRange,
  SetupUIFilters,
} from '../../helpers/setup_request';
import { hasHistoricalAgentData } from './has_historical_agent_data';
import { getLegacyDataStatus } from './get_legacy_data_status';
import { getServicesItems } from './get_services_items';

export type ServiceListAPIResponse = PromiseReturnType<typeof getServices>;

export async function getServices({
  setup,
  mlAnomaliesEnvironment,
}: {
  setup: Setup & SetupTimeRange & SetupUIFilters;
  mlAnomaliesEnvironment?: string;
}) {
  const [items, hasLegacyData] = await Promise.all([
    getServicesItems({ setup, mlAnomaliesEnvironment }),
    getLegacyDataStatus(setup),
  ]);

  const noDataInCurrentTimeRange = isEmpty(items);
  const hasHistoricalData = noDataInCurrentTimeRange
    ? await hasHistoricalAgentData(setup)
    : true;

  return {
    items,
    hasHistoricalData,
    hasLegacyData,
  };
}
