/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { isEmpty } from 'lodash';
import { withApmSpan } from '../../../utils/with_apm_span';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';
import { getLegacyDataStatus } from './get_legacy_data_status';
import { getServicesItems } from './get_services_items';
import { hasHistoricalAgentData } from './has_historical_agent_data';

export async function getServices({
  environment,
  setup,
  searchAggregatedTransactions,
  logger,
}: {
  environment?: string;
  setup: Setup & SetupTimeRange;
  searchAggregatedTransactions: boolean;
  logger: Logger;
}) {
  return withApmSpan('get_services', async () => {
    const [items, hasLegacyData] = await Promise.all([
      getServicesItems({
        environment,
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
  });
}
