/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { from, where } from '@kbn/esql-composer';
import {
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_DURATION,
  SPAN_NAME,
  TRANSACTION_DURATION,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '@kbn/apm-types';
import { useAdHocApmDataView } from '../../../../hooks/use_adhoc_apm_data_view';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import {
  ENVIRONMENT_ALL_VALUE,
  ENVIRONMENT_NOT_DEFINED_VALUE,
} from '../../../../../common/environment_filter_values';
import { useAnyOfApmParams } from '../../../../hooks/use_apm_params';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';

export function ViewInDiscover() {
  const { share } = useApmPluginContext();
  const { serviceName } = useApmServiceContext();
  const { dataView } = useAdHocApmDataView();

  const { query: queryParams } = useAnyOfApmParams(
    '/services/{serviceName}/transactions/view',
    '/mobile-services/{serviceName}/transactions/view',
    '/dependencies/operation',
    '/traces/explorer/waterfall'
  );
  const {
    transactionName,
    transactionType,
    spanName,
    sampleRangeFrom,
    sampleRangeTo,
    environment,
    dependencyName,
    kuery,
    // we need to convert it here since /dependencies/operation uses span instead of transaction,
    // to avoid changing the routes, we do this workaround
  } = queryParams as unknown as {
    transactionName: string;
    transactionType: string;
    spanName: string;
    sampleRangeFrom: number;
    sampleRangeTo: number;
    environment: string;
    dependencyName: string;
    kuery: string;
  };

  const discoverHref = share.url.locators.get(DISCOVER_APP_LOCATOR)?.getRedirectUrl({
    query: {
      esql: from(dataView?.getIndexPattern() ?? 'traces-*')
        .pipe(
          serviceName
            ? where(`${SERVICE_NAME} == ?serviceName`, { serviceName })
            : (query) => query,
          environment &&
            environment !== ENVIRONMENT_ALL_VALUE &&
            environment !== ENVIRONMENT_NOT_DEFINED_VALUE
            ? where(`${SERVICE_ENVIRONMENT} == ?environment`, { environment })
            : (query) => query,
          transactionName || spanName
            ? where(`${transactionName ? TRANSACTION_NAME : SPAN_NAME} == ?name`, {
                name: transactionName ?? spanName,
              })
            : (query) => query,
          transactionType
            ? where(`${TRANSACTION_TYPE} == ?transactionType`, { transactionType })
            : (query) => query,
          dependencyName
            ? where(`${SPAN_DESTINATION_SERVICE_RESOURCE} == ?dependencyName`, { dependencyName })
            : (query) => query,
          sampleRangeFrom && sampleRangeTo
            ? where(
                `${
                  transactionName ? TRANSACTION_DURATION : SPAN_DURATION
                } >= ?sampleRangeFrom AND ${
                  transactionName ? TRANSACTION_DURATION : SPAN_DURATION
                } <= ?sampleRangeTo`,
                {
                  sampleRangeFrom,
                  sampleRangeTo,
                }
              )
            : (query) => query,
          kuery ? where(`QSTR("${kuery.replaceAll('"', '\\"')}")`) : (query) => query
        )
        .toString(),
    },
  });

  return (
    <EuiButtonEmpty
      aria-label={i18n.translate('xpack.apm.waterfallWithSummary.viewInDiscoverButton.ariaLabel', {
        defaultMessage: 'View in Discover',
      })}
      data-test-subj="apmWaterfallWithSummaryViewInDiscoverButton"
      iconType="discoverApp"
      href={discoverHref}
    >
      {i18n.translate('xpack.apm.waterfallWithSummary.viewInDiscoverButton.label', {
        defaultMessage: 'View in Discover',
      })}
    </EuiButtonEmpty>
  );
}
