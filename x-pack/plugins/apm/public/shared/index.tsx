/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppMountParameters } from '@kbn/core-application-browser';
import { ObservabilityRuleTypeRegistry } from '@kbn/observability-plugin/public';
import React, { lazy, Suspense, useEffect } from 'react';
import { EuiSkeletonRectangle } from '@elastic/eui';
import { CoreSetup, CoreStart } from '@kbn/core-lifecycle-browser';
import { ApmPluginSetupDeps, ApmPluginStartDeps } from '../plugin';
import { createCallApmApi } from '../services/rest/create_call_apm_api';

const TransactionOverviewEmbeddableLazy = lazy(
  () =>
    import(
      '../components/app/transaction_overview/transaction_overview_embeddable'
    )
);

export function APMTransactionOverviewEmbeddable(props: {
  serviceName: string;
  start: string;
  end: string;
  offset: string;
  url?: string;
  core: CoreSetup;
  coreStart: CoreStart;
  plugins: ApmPluginSetupDeps;
  appMountParameters: AppMountParameters;
  pluginsStart: ApmPluginStartDeps;
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry;
}) {
  useEffect(() => {
    createCallApmApi(props.coreStart);
  }, [props.coreStart]);

  return (
    <Suspense fallback={<EuiSkeletonRectangle width="100%" height={140} />}>
      <TransactionOverviewEmbeddableLazy {...props} />
    </Suspense>
  );
}
