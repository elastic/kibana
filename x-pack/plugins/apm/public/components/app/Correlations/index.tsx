/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import url from 'url';
import { useParams } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { EuiTitle, EuiListGroup } from '@elastic/eui';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { useApmPluginContext } from '../../../hooks/useApmPluginContext';

const SESSION_STORAGE_KEY = 'apm.debug.show_correlations';

export function Correlations() {
  const location = useLocation();
  const { serviceName } = useParams<{ serviceName?: string }>();
  const { urlParams, uiFilters } = useUrlParams();
  const { core } = useApmPluginContext();
  const { transactionName, transactionType, start, end } = urlParams;

  if (
    !location.search.includes('&_show_correlations') &&
    sessionStorage.getItem(SESSION_STORAGE_KEY) !== 'true'
  ) {
    return null;
  }

  sessionStorage.setItem(SESSION_STORAGE_KEY, 'true');

  const query = {
    serviceName,
    transactionName,
    transactionType,
    start,
    end,
    uiFilters: JSON.stringify(uiFilters),
    fieldNames:
      'user.username,user.id,host.ip,user_agent.name,kubernetes.pod.uuid,url.domain,container.id,service.node.name',
  };

  const listItems = [
    {
      label: 'Show correlations between two ranges',
      href: url.format({
        query: {
          ...query,
          gap: 24,
        },
        pathname: core.http.basePath.prepend(`/api/apm/correlations/ranges`),
      }),
      isDisabled: false,
      iconType: 'tokenRange',
      size: 's' as const,
    },

    {
      label: 'Show correlations for slow transactions',
      href: url.format({
        query: {
          ...query,
          durationPercentile: 95,
        },
        pathname: core.http.basePath.prepend(
          `/api/apm/correlations/slow_durations`
        ),
      }),
      isDisabled: false,
      iconType: 'clock',
      size: 's' as const,
    },
  ];

  return (
    <>
      <EuiTitle>
        <h2>Correlations</h2>
      </EuiTitle>

      <EuiListGroup listItems={listItems} />
    </>
  );
}
