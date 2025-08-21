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
  const { query: queryParams } = useAnyOfApmParams(
    '/services/{serviceName}/transactions/view',
    '/mobile-services/{serviceName}/transactions/view',
    '/dependencies/operation'
  );
  const {
    transactionName,
    transactionType,
    spanName,
    sampleRangeFrom,
    sampleRangeTo,
    environment,
    // we need to convert it here since /dependencies/operation uses span instead of transaction,
    // to avoid changing the routes, we do this workaround
  } = queryParams as unknown as {
    transactionName: string;
    transactionType: string;
    spanName: string;
    sampleRangeFrom: number;
    sampleRangeTo: number;
    environment: string;
  };
  const discoverHref = share.url.locators.get(DISCOVER_APP_LOCATOR)?.getRedirectUrl({
    query: {
      esql: from('traces-*')
        .pipe(
          serviceName ? where(`service.name == ?serviceName`, { serviceName }) : (query) => query,
          environment &&
            environment !== ENVIRONMENT_ALL_VALUE &&
            environment !== ENVIRONMENT_NOT_DEFINED_VALUE
            ? where(`service.environment == ?environment`, { environment })
            : (query) => query,
          transactionName
            ? where(`transaction.name == ?transactionName`, { transactionName })
            : (query) => query,
          spanName ? where(`span.name == ?spanName`, { spanName }) : (query) => query,
          transactionType
            ? where(`transaction.type == ?transactionType`, { transactionType })
            : (query) => query,
          sampleRangeFrom
            ? where(`transaction.duration.us >= ?sampleRangeFrom`, { sampleRangeFrom })
            : (query) => query,
          sampleRangeTo
            ? where(`transaction.duration.us <= ?sampleRangeTo`, { sampleRangeTo })
            : (query) => query
        )
        .toString(),
    },
  });

  return (
    <EuiButtonEmpty
      aria-label={i18n.translate('xpack.apm.waterfallWithSummary.viewInDiscoverButton.ariaLabel', {
        defaultMessage: 'View in Discover',
      })}
      data-test-subj="apmWaterfallWithSummaryGoToDiscoverButton"
      iconType="discoverApp"
      href={discoverHref}
    >
      {i18n.translate('xpack.apm.waterfallWithSummary.viewInDiscoverButton.label', {
        defaultMessage: 'View in Discover',
      })}
    </EuiButtonEmpty>
  );
}
