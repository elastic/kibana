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
import { ProfilingFlamegraph } from './profiling_flamegraph';
import { ProfilingTopNFunctions } from './profiling_top_functions';

function ProfilingTab() {
  const {
    query: { rangeFrom, rangeTo, environment, kuery, transactionName },
    path: { serviceName },
  } = useApmParams('/services/{serviceName}/transactions/view');

  return (
    <>
      <ProfilingFlamegraph
        serviceName={serviceName}
        rangeFrom={rangeFrom}
        rangeTo={rangeTo}
        kuery={kuery}
        transactionName={transactionName}
      />
      <EuiSpacer />
      <ProfilingTopNFunctions
        serviceName={serviceName}
        rangeFrom={rangeFrom}
        rangeTo={rangeTo}
        kuery={kuery}
        transactionName={transactionName}
      />
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
