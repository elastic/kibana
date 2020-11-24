/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from '@kbn/logging';
import { isEmpty } from 'lodash';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';
import { getLegacyDataStatus } from './get_legacy_data_status';
import { getServicesItems } from './get_services_items';
import { hasHistoricalAgentData } from './has_historical_agent_data';

export async function getServices({
  setup,
  searchAggregatedTransactions,
  logger,
}: {
  setup: Setup & SetupTimeRange;
  searchAggregatedTransactions: boolean;
  logger: Logger;
}) {
  const [items, hasLegacyData] = await Promise.all([
    getServicesItems({
      setup,
      searchAggregatedTransactions,
      logger,
    }),
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
