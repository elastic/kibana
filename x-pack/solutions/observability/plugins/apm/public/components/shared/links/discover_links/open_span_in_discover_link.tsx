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

import { EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ApmIndexSettingsResponse } from '@kbn/apm-sources-access-plugin/server/routes/settings';
import { from, where } from '@kbn/esql-composer';
import { SPAN_ID } from '@kbn/apm-types';
import type { ApmPluginStartDeps } from '../../../../plugin';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { useAnyOfApmParams } from '../../../../hooks/use_apm_params';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';

export const getESQLQuery = ({
  params,
  apmIndexSettings,
}: {
  params: {
    kuery?: string;
    spanId?: string;
  };
  apmIndexSettings: ApmIndexSettingsResponse['apmIndexSettings'];
}) => {
  const { kuery, spanId } = params;

  const tracesIndices = apmIndexSettings
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
  const { services } = useKibana<ApmPluginStartDeps>();

  const {
    query: { rangeFrom, rangeTo, kuery },
  } = useAnyOfApmParams(
    '/services/{serviceName}/transactions/view',
    '/mobile-services/{serviceName}/transactions/view',
    '/dependencies/operation',
    '/traces/explorer/waterfall'
  );

  const { data = { apmIndexSettings: [] } } = useFetcher(
    (_, signal) => services.apmSourcesAccess.getApmIndexSettings({ signal }),
    [services.apmSourcesAccess]
  );

  const params = {
    kuery,
    spanId,
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
    <EuiLink
      aria-label={i18n.translate('xpack.apm.openSpanInDiscoverLink.ariaLabel', {
        defaultMessage: 'Open in Discover',
      })}
      data-test-subj={dataTestSubj}
      href={discoverHref}
    >
      {i18n.translate('xpack.apm.openSpanInDiscoverLink.label', {
        defaultMessage: 'Open in Discover',
      })}
    </EuiLink>
  );
}
