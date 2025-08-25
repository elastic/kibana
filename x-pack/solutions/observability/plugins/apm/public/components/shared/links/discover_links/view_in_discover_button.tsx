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
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ApmPluginStartDeps } from '../../../../plugin';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import {
  ENVIRONMENT_ALL_VALUE,
  ENVIRONMENT_NOT_DEFINED_VALUE,
} from '../../../../../common/environment_filter_values';
import { useAnyOfApmParams } from '../../../../hooks/use_apm_params';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';

export function ViewInDiscoverButton({ dataTestSubj }: { dataTestSubj: string }) {
  const { share } = useApmPluginContext();
  const { serviceName } = useApmServiceContext();
  const { services } = useKibana<ApmPluginStartDeps>();

  const { query: queryParams } = useAnyOfApmParams(
    '/services/{serviceName}/transactions/view',
    '/mobile-services/{serviceName}/transactions/view',
    '/dependencies/operation',
    '/traces/explorer/waterfall'
  );

  const { rangeFrom, rangeTo, kuery, environment } = queryParams;

  // we need to check if those fields exist before accessing them,
  // since not all routes include them
  const transactionName =
    'transactionName' in queryParams ? queryParams.transactionName : undefined;
  const transactionType =
    'transactionType' in queryParams ? queryParams.transactionType : undefined;
  const spanName = 'spanName' in queryParams ? queryParams.spanName : undefined;
  const sampleRangeFrom =
    'sampleRangeFrom' in queryParams ? queryParams.sampleRangeFrom : undefined;
  const sampleRangeTo = 'sampleRangeTo' in queryParams ? queryParams.sampleRangeTo : undefined;
  const dependencyName = 'dependencyName' in queryParams ? queryParams.dependencyName : undefined;

  const { data = { apmIndexSettings: [] } } = useFetcher(
    (_, signal) => services.apmSourcesAccess.getApmIndexSettings({ signal }),
    [services.apmSourcesAccess]
  );

  const tracesIndices = data?.apmIndexSettings
    .filter((indexSetting) => ['transaction', 'span'].includes(indexSetting.configurationName))
    .map((indexSetting) => indexSetting.savedValue ?? indexSetting.defaultValue);
  const dedupedIndices = Array.from(new Set(tracesIndices)).join(',');

  const discoverHref = share.url.locators.get(DISCOVER_APP_LOCATOR)?.getRedirectUrl({
    timeRange: {
      from: rangeFrom,
      to: rangeTo,
    },
    query: {
      esql: from(dedupedIndices)
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
            ? where(`??nameField == ?name`, {
                nameField: transactionName ? TRANSACTION_NAME : SPAN_NAME,
                name: (transactionName ?? spanName) as string,
              })
            : (query) => query,
          transactionType
            ? where(`${TRANSACTION_TYPE} == ?transactionType`, { transactionType })
            : (query) => query,
          dependencyName
            ? where(`${SPAN_DESTINATION_SERVICE_RESOURCE} == ?dependencyName`, { dependencyName })
            : (query) => query,
          sampleRangeFrom && sampleRangeTo
            ? where(`??durationField >= ?sampleRangeFrom AND ??durationField <= ?sampleRangeTo`, {
                durationField: transactionName ? TRANSACTION_DURATION : SPAN_DURATION,
                sampleRangeFrom,
                sampleRangeTo,
              })
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
      data-test-subj={dataTestSubj}
      iconType="discoverApp"
      href={discoverHref}
    >
      {i18n.translate('xpack.apm.waterfallWithSummary.viewInDiscoverButton.label', {
        defaultMessage: 'View in Discover',
      })}
    </EuiButtonEmpty>
  );
}
