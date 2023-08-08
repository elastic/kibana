/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MobileProperty,
  MobilePropertyType,
} from '../../../common/mobile_types';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { getDeviceOSApp } from './get_device_os_app';
import { getNCT } from './get_nct';

export type MobileFiltersResponse = Array<{
  key: MobilePropertyType;
  options: string[];
}>;

export async function getMobileFilters({
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
}): Promise<MobileFiltersResponse> {
  const MAX_ITEMS = 10;
  const commonProps = {
    kuery,
    apmEventClient,
    serviceName,
    transactionType,
    environment,
    start,
    end,
    size: MAX_ITEMS,
  };

  const [
    mobileTransactionEventsFiltersResponse,
    mobileNetworkConnectionTypeFiltersResponse,
  ] = await Promise.all([getDeviceOSApp(commonProps), getNCT(commonProps)]);

  return [
    {
      key: MobileProperty.Device,
      options:
        mobileTransactionEventsFiltersResponse.aggregations?.devices?.buckets?.map(
          ({ key }) => key as string
        ) || [],
    },
    {
      key: MobileProperty.OsVersion,
      options:
        mobileTransactionEventsFiltersResponse.aggregations?.osVersions?.buckets?.map(
          ({ key }) => key as string
        ) || [],
    },
    {
      key: MobileProperty.AppVersion,
      options:
        mobileTransactionEventsFiltersResponse.aggregations?.appVersions?.buckets?.map(
          ({ key }) => key as string
        ) || [],
    },
    {
      key: MobileProperty.NetworkConnectionType,
      options:
        mobileNetworkConnectionTypeFiltersResponse.aggregations?.netConnectionTypes?.buckets?.map(
          ({ key }) => key as string
        ) || [],
    },
  ];
}
