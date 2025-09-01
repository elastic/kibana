/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
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
import type { ApmIndexSettingsResponse } from '@kbn/apm-sources-access-plugin/server/routes/settings';
import { from, where } from '@kbn/esql-composer';
import { SPAN_ID } from '@kbn/apm-types';
import { FETCH_STATUS } from '@kbn/observability-shared-plugin/public';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useAnyOfApmParams } from '../../../../hooks/use_apm_params';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';

export const getESQLQuery = ({
  params,
  indexSettings,
}: {
  params: {
    kuery?: string;
    spanId?: string;
  };
  indexSettings: ApmIndexSettingsResponse['apmIndexSettings'];
}) => {
  if (!indexSettings || indexSettings?.length === 0) {
    return null;
  }

  const { kuery, spanId } = params;

  const tracesIndices = indexSettings
    .filter((indexSetting) => ['span', 'transaction'].includes(indexSetting.configurationName))
    .map((indexSetting) => indexSetting.savedValue ?? indexSetting.defaultValue);
  const dedupedIndices = Array.from(new Set(tracesIndices)).join(',');

  const filters = [];

  if (spanId) {
    filters.push(where(`${SPAN_ID} == ?spanId`, { spanId }));
  }

  if (kuery) {
    filters.push(where(`KQL("${kuery.replaceAll('"', '\\"')}")`));
  }

  return from(dedupedIndices)
    .pipe(...filters)
    .toString();
};

export function OpenSpanInDiscoverLink({
  dataTestSubj,
  spanId,
}: {
  dataTestSubj: string;
  spanId: string;
}) {
  const { share } = useApmPluginContext();
  const { indexSettings, indexSettingsStatus } = useApmServiceContext();

  const {
    query: { rangeFrom, rangeTo, kuery },
  } = useAnyOfApmParams(
    '/services/{serviceName}/transactions/view',
    '/mobile-services/{serviceName}/transactions/view',
    '/dependencies/operation',
    '/traces/explorer/waterfall'
  );

  const params = {
    kuery,
    spanId,
  };

  const esqlQuery = getESQLQuery({
    params,
    indexSettings,
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
      aria-label={i18n.translate('xpack.apm.openSpanInDiscoverLink.ariaLabel', {
        defaultMessage: 'Open in Discover',
      })}
      isLoading={indexSettingsStatus === FETCH_STATUS.LOADING}
      data-test-subj={dataTestSubj}
      iconType="discoverApp"
      href={discoverHref}
      isDisabled={!esqlQuery || indexSettingsStatus !== FETCH_STATUS.SUCCESS}
    >
      {i18n.translate('xpack.apm.openSpanInDiscoverLink.label', {
        defaultMessage: 'Open in Discover',
      })}
    </EuiButtonEmpty>
  );
}
