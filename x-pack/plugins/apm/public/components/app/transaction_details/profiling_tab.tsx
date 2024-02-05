/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useFetcher } from '../../../hooks/use_fetcher';
import { useTimeRange } from '../../../hooks/use_time_range';
import { ProfilingFlamegraphChart } from '../../shared/profiling/flamegraph';
import { ProfilingFlamegraphLink } from '../../shared/profiling/flamegraph/flamegraph_link';

function ProfilingTab() {
  const {
    query: { rangeFrom, rangeTo, environment, kuery, transactionName },
    path: { serviceName },
  } = useApmParams('/services/{serviceName}/transactions/view');
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { data, status } = useFetcher(
    (callApmApi) => {
      return callApmApi(
        'GET /internal/apm/services/{serviceName}/transactions/flamegraph',
        {
          params: {
            path: { serviceName },
            query: {
              start,
              end,
              kuery,
              transactionName,
            },
          },
        }
      );
    },
    [serviceName, start, end, kuery, transactionName]
  );

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <ProfilingFlamegraphLink
          kuery={kuery}
          rangeFrom={rangeFrom}
          rangeTo={rangeTo}
        />
      </div>
      <EuiSpacer />
      <ProfilingFlamegraphChart data={data} status={status} />
    </>
  );
}

export const profilingTab = {
  dataTestSubj: 'apmProfilingTabButton',
  key: 'Profiling',
  label: i18n.translate('xpack.apm.transactionDetails.tabs.ProfilingLabel', {
    defaultMessage: 'Universal Profiling',
  }),
  component: ProfilingTab,
};
