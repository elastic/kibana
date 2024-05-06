/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { mergeCountWithOther } from './merge_other_count';
import { MobileProperty, MobilePropertyType } from '../../../../common/mobile_types';
import { getDeviceOSApp } from '../get_device_os_app';
import { getNCT } from '../get_nct';

export type MobileMostUsedChartResponse = Array<{
  key: MobilePropertyType;
  options: Array<{
    key: string | number;
    docCount: number;
  }>;
}>;
export async function getMobileMostUsedCharts({
  kuery,
  apmEventClient,
  serviceName,
  transactionType,
  environment,
  start,
  end,
}: {
  kuery: string;
  apmEventClient: APMEventClient;
  serviceName: string;
  transactionType?: string;
  environment: string;
  start: number;
  end: number;
}): Promise<MobileMostUsedChartResponse> {
  const MAX_ITEMS_PER_CHART = 5;
  const commonProps = {
    kuery,
    apmEventClient,
    serviceName,
    transactionType,
    environment,
    start,
    end,
    size: MAX_ITEMS_PER_CHART,
  };
  const [mobileTransactionEventsResponse, mobileNetworkConnectionTypeResponse] = await Promise.all([
    getDeviceOSApp(commonProps),
    getNCT(commonProps),
  ]);

  return [
    {
      key: MobileProperty.Device,
      options:
        mergeCountWithOther(
          mobileTransactionEventsResponse.aggregations?.devices?.buckets,
          mobileTransactionEventsResponse.aggregations?.devices?.sum_other_doc_count
        ) || [],
    },
    {
      key: MobileProperty.OsVersion,
      options:
        mergeCountWithOther(
          mobileTransactionEventsResponse.aggregations?.osVersions?.buckets,
          mobileTransactionEventsResponse.aggregations?.osVersions?.sum_other_doc_count
        ) || [],
    },
    {
      key: MobileProperty.AppVersion,
      options:
        mergeCountWithOther(
          mobileTransactionEventsResponse.aggregations?.appVersions?.buckets,
          mobileTransactionEventsResponse.aggregations?.appVersions?.sum_other_doc_count
        ) || [],
    },
    {
      key: MobileProperty.NetworkConnectionType,
      options:
        mergeCountWithOther(
          mobileNetworkConnectionTypeResponse.aggregations?.netConnectionTypes?.buckets,
          mobileNetworkConnectionTypeResponse.aggregations?.netConnectionTypes?.sum_other_doc_count
        ) || [],
    },
  ];
}
