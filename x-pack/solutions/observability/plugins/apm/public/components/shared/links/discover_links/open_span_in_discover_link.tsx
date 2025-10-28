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

import { i18n } from '@kbn/i18n';
import React from 'react';
import type { ApmIndexSettingsResponse } from '@kbn/apm-sources-access-plugin/server/routes/settings';
import { from } from '@kbn/esql-composer';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useAnyOfApmParams } from '../../../../hooks/use_apm_params';
import { BaseDiscoverButton } from './base_discover_button';
import { filterByKuery, filterBySpanId } from './filters';

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
    filters.push(filterBySpanId(spanId));
  }

  if (kuery) {
    filters.push(filterByKuery(kuery));
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
  const { indexSettings } = useApmServiceContext();

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

  return (
    <BaseDiscoverButton
      dataTestSubj={dataTestSubj}
      esqlQuery={esqlQuery}
      rangeTo={rangeTo}
      rangeFrom={rangeFrom}
      label={i18n.translate('xpack.apm.openSpanInDiscoverLink.label', {
        defaultMessage: 'Open in Discover',
      })}
      ariaLabel={i18n.translate('xpack.apm.openSpanInDiscoverLink.ariaLabel', {
        defaultMessage: 'Open in Discover',
      })}
    />
  );
}
