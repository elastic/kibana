/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash';
import { Logger } from '@kbn/logging';
import { DateBucketUnit } from '../../../../common/utils/get_date_bucket_options';
import { PromiseReturnType } from '../../../../typings/common';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';
import { hasHistoricalAgentData } from './has_historical_agent_data';
import { getLegacyDataStatus } from './get_legacy_data_status';
import { getServicesItems } from './get_services_items';

export type ServiceListAPIResponse = PromiseReturnType<typeof getServices>;

export async function getServices({
  setup,
  searchAggregatedTransactions,
  logger,
  intervalString,
  unit,
}: {
  setup: Setup & SetupTimeRange;
  searchAggregatedTransactions: boolean;
  logger: Logger;
  intervalString: string;
  unit: DateBucketUnit;
}) {
  const [items, hasLegacyData] = await Promise.all([
    getServicesItems({
      setup,
      searchAggregatedTransactions,
      logger,
      intervalString,
      unit,
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
