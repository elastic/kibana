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
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ApmIndexSettingsResponse } from '@kbn/apm-sources-access-plugin/server/routes/settings';
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
import type { ApmPluginStartDeps } from '../../../../plugin';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useAnyOfApmParams } from '../../../../hooks/use_apm_params';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import {
  ENVIRONMENT_ALL_VALUE,
  ENVIRONMENT_NOT_DEFINED_VALUE,
} from '../../../../../common/environment_filter_values';

const getESQLQuery = ({
  params,
  apmIndexSettings,
}: {
  params: {
    serviceName?: string;
    kuery?: string;
    environment?: string;
    transactionName?: string;
    transactionType?: string;
    sampleRangeFrom?: number;
    sampleRangeTo?: number;
    dependencyName?: string;
    spanName?: string;
    spanId?: string;
    errorGroupId?: string;
  };
  apmIndexSettings: ApmIndexSettingsResponse['apmIndexSettings'];
}) => {
  const {
    serviceName,
    kuery,
    environment,
    transactionName,
    transactionType,
    sampleRangeFrom,
    sampleRangeTo,
    dependencyName,
    spanName,
  } = params;

  const tracesIndices = apmIndexSettings
    .filter((indexSetting) => ['span', 'transaction'].includes(indexSetting.configurationName))
    .map((indexSetting) => indexSetting.savedValue ?? indexSetting.defaultValue);
  const dedupedIndices = Array.from(new Set(tracesIndices)).join(',');

  const filters = [];

  if (serviceName) {
    filters.push(where(`${SERVICE_NAME} == ?serviceName`, { serviceName }));
  }

  if (
    environment &&
    environment !== ENVIRONMENT_ALL_VALUE &&
    environment !== ENVIRONMENT_NOT_DEFINED_VALUE
  ) {
    filters.push(where(`${SERVICE_ENVIRONMENT} == ?environment`, { environment }));
  }

  if (transactionName || spanName) {
    filters.push(
      where(`??nameField == ?name`, {
        nameField: transactionName ? TRANSACTION_NAME : SPAN_NAME,
        name: (transactionName ?? spanName) as string,
      })
    );
  }

  if (transactionType) {
    filters.push(where(`${TRANSACTION_TYPE} == ?transactionType`, { transactionType }));
  }

  if (dependencyName) {
    filters.push(
      where(`${SPAN_DESTINATION_SERVICE_RESOURCE} == ?dependencyName`, { dependencyName })
    );
  }

  if (sampleRangeFrom && sampleRangeTo) {
    filters.push(
      where(`??durationField >= ?sampleRangeFrom AND ??durationField <= ?sampleRangeTo`, {
        durationField: transactionName ? TRANSACTION_DURATION : SPAN_DURATION,
        sampleRangeFrom,
        sampleRangeTo,
      })
    );
  }

  if (kuery) {
    filters.push(where(`KQL("${kuery.replaceAll('"', '\\"')}")`));
  }

  return from(dedupedIndices)
    .pipe(...filters)
    .toString();
};

export function OpenInDiscoverButton({ dataTestSubj }: { dataTestSubj: string }) {
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

  const params = {
    serviceName,
    kuery,
    environment,
    transactionName,
    transactionType,
    sampleRangeFrom,
    sampleRangeTo,
    dependencyName,
    spanName,
  };

  const esqlQuery = getESQLQuery({
    params,
    apmIndexSettings: data.apmIndexSettings,
  });

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
      aria-label={i18n.translate('xpack.apm.waterfallWithSummary.openInDiscoverButton.ariaLabel', {
        defaultMessage: 'Open in Discover',
      })}
      data-test-subj={dataTestSubj}
      iconType="discoverApp"
      href={discoverHref}
    >
      {i18n.translate('xpack.apm.waterfallWithSummary.openInDiscoverButton.label', {
        defaultMessage: 'Open in Discover',
      })}
    </EuiButtonEmpty>
  );
}
