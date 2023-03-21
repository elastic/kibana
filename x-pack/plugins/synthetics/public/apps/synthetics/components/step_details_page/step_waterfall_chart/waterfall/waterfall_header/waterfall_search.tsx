/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFieldSearch, EuiFlexGroup, EuiText, useEuiTheme } from '@elastic/eui';
import useDebounce from 'react-use/lib/useDebounce';
import { METRIC_TYPE, useUiTracker } from '@kbn/observability-plugin/public';
import { FILTER_REQUESTS_LABEL, SEARCH_REQUESTS_LABEL } from '../translations';
import { NetworkRequestsTotal } from './network_requests_total';

interface Props {
  query: string;
  setQuery: (val: string) => void;
  totalNetworkRequests: number;
  highlightedNetworkRequests: number;
  fetchedNetworkRequests: number;
}

export const WaterfallSearch = ({
  query,
  setQuery,
  totalNetworkRequests,
  highlightedNetworkRequests,
  fetchedNetworkRequests,
}: Props) => {
  const trackMetric = useUiTracker({ app: 'uptime' });

  const [value, setValue] = useState(query);
  const { euiTheme } = useEuiTheme();

  useDebounce(
    () => {
      setQuery(value);
    },
    300,
    [value]
  );

  // indicates use of the query input box
  useEffect(() => {
    if (query) {
      trackMetric({ metric: 'waterfall_filter_input_changed', metricType: METRIC_TYPE.CLICK });
    }
  }, [query, trackMetric]);

  return (
    <EuiFlexGroup
      direction="column"
      justifyContent="spaceBetween"
      gutterSize="s"
      style={{ marginRight: euiTheme.size.l }}
    >
      <EuiText size="xs">
        <h3>{NETWORK_REQUESTS_LABEL}</h3>
      </EuiText>

      <EuiFieldSearch
        fullWidth
        aria-label={FILTER_REQUESTS_LABEL}
        placeholder={SEARCH_REQUESTS_LABEL}
        onChange={(evt) => {
          setValue(evt.target.value);
        }}
        value={value}
      />

      <NetworkRequestsTotal
        totalNetworkRequests={totalNetworkRequests}
        highlightedNetworkRequests={highlightedNetworkRequests}
        fetchedNetworkRequests={fetchedNetworkRequests}
      />
    </EuiFlexGroup>
  );
};

const NETWORK_REQUESTS_LABEL = i18n.translate(
  'xpack.synthetics.waterfall.networkRequests.heading',
  {
    defaultMessage: 'Network Requests',
  }
);
