/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { FETCH_STATUS } from '@kbn/observability-shared-plugin/public';
import { where } from '@kbn/esql-composer';
import {
  ERROR_GROUP_ID,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_DURATION,
  SPAN_ID,
  SPAN_NAME,
  TRANSACTION_DURATION,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '@kbn/apm-types';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';

export const filterByKuery = (kuery: string) => {
  return where(
    `KQL("${kuery.trim().replaceAll('"', '\\"').replaceAll(/\s+/g, ' ').replaceAll(/\n+/g, ' ')}")`
  );
};

export const filterByServiceName = (serviceName: string) => {
  return where(`${SERVICE_NAME} == ?serviceName`, { serviceName });
};

export const filterByErrorGroupId = (errorGroupId: string) => {
  return where(`${ERROR_GROUP_ID} == ?errorGroupId`, { errorGroupId });
};

export const filterByEnvironment = (environment: string) => {
  return where(`${SERVICE_ENVIRONMENT} == ?environment`, { environment });
};

export const filterByTransactionNameOrSpanName = (
  transactionName: string | undefined,
  spanName: string | undefined
) => {
  return where(`??nameField == ?name`, {
    nameField: transactionName ? TRANSACTION_NAME : SPAN_NAME,
    name: (transactionName ?? spanName) as string,
  });
};

export const filterByTransactionType = (transactionType: string) => {
  return where(`${TRANSACTION_TYPE} == ?transactionType`, { transactionType });
};

export const filterByDependencyName = (dependencyName: string) => {
  return where(`${SPAN_DESTINATION_SERVICE_RESOURCE} == ?dependencyName`, { dependencyName });
};

export const filterBySpanId = (spanId: string) => {
  return where(`${SPAN_ID} == ?spanId`, { spanId });
};

export const filterBySampleRange = (
  sampleRangeFrom: number,
  sampleRangeTo: number,
  transactionName: string | undefined
) => {
  return where(`??durationField >= ?sampleRangeFrom AND ??durationField <= ?sampleRangeTo`, {
    durationField: transactionName ? TRANSACTION_DURATION : SPAN_DURATION,
    sampleRangeFrom,
    sampleRangeTo,
  });
};

export function BaseDiscoverButton({
  dataTestSubj,
  esqlQuery,
  rangeTo,
  rangeFrom,
  label,
  ariaLabel,
}: {
  dataTestSubj: string;
  esqlQuery: string | null;
  rangeTo: string;
  rangeFrom: string;
  label: string;
  ariaLabel: string;
}) {
  const { share } = useApmPluginContext();
  const { indexSettingsStatus } = useApmServiceContext();

  const discoverHref = share.url.locators.get(DISCOVER_APP_LOCATOR)?.getRedirectUrl({
    timeRange: {
      from: rangeFrom,
      to: rangeTo,
    },
    query: {
      esql: esqlQuery,
    },
  });

  return (
    <EuiButtonEmpty
      aria-label={ariaLabel}
      isLoading={indexSettingsStatus === FETCH_STATUS.LOADING}
      data-test-subj={dataTestSubj}
      iconType="discoverApp"
      href={discoverHref}
      isDisabled={!esqlQuery || indexSettingsStatus !== FETCH_STATUS.SUCCESS}
    >
      {label}
    </EuiButtonEmpty>
  );
}
