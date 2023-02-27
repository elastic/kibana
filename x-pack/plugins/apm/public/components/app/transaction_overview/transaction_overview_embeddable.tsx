/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel } from '@elastic/eui';
import { AppMountParameters, CoreSetup, CoreStart } from '@kbn/core/public';
import {
  InspectorContextProvider,
  ObservabilityRuleTypeRegistry,
} from '@kbn/observability-plugin/public';
import {
  ApmPluginContext,
  ApmPluginContextValue,
} from '../../../context/apm_plugin/apm_plugin_context';
import { ApmPluginSetupDeps, ApmPluginStartDeps } from '../../../plugin';
import { TimeRangeIdContextProvider } from '../../../context/time_range_id/time_range_id_context';
import { TransactionsTableEmbeddable } from '../../shared/transactions_table/transactions_table_embeddable';

function Embeddable({
  serviceName,
  start,
  end,
  url,
}: {
  serviceName: string;
  start: string;
  end: string;
  url?: string;
}) {
  const environment = 'ENVIRONMENT_ALL';
  const transactionType = 'request';
  const offset = '1d';
  const comparisonEnabled = true;
  const kuery = url ? `url.full: "${url}"` : '';

  return (
    <EuiPanel hasBorder={true}>
      <TransactionsTableEmbeddable
        hideViewTransactionsLink={false}
        numberOfTransactionsPerPage={25}
        showMaxTransactionGroupsExceededWarning
        environment={environment}
        kuery={kuery}
        start={start}
        end={end}
        saveTableOptionsToUrl
        comparisonEnabled={comparisonEnabled}
        transactionType={transactionType}
        offset={offset}
        serviceName={serviceName}
        url={url}
      />
    </EuiPanel>
  );
}

// eslint-disable-next-line import/no-default-export
export default function ({
  serviceName,
  start,
  end,
  url,
  core,
  coreStart,
  plugins,
  appMountParameters,
  pluginsStart,
  observabilityRuleTypeRegistry,
}: {
  serviceName: string;
  start: string;
  end: string;
  url?: string;
  core: CoreSetup;
  coreStart: CoreStart;
  plugins: ApmPluginSetupDeps;
  appMountParameters: AppMountParameters;
  pluginsStart: ApmPluginStartDeps;
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry;
}) {
  const apmPluginContextValue: ApmPluginContextValue = {
    appMountParameters,
    config: { serviceMapEnabled: true, ui: { enabled: true } },
    core: coreStart,
    plugins,
    data: pluginsStart.data,
    inspector: pluginsStart.inspector,
    observability: pluginsStart.observability,
    observabilityRuleTypeRegistry,
    dataViews: pluginsStart.dataViews,
    unifiedSearch: pluginsStart.unifiedSearch,
  };

  return (
    <ApmPluginContext.Provider value={apmPluginContextValue}>
      <TimeRangeIdContextProvider>
        <InspectorContextProvider>
          <Embeddable
            serviceName={serviceName}
            start={start}
            end={end}
            url={url}
          />
        </InspectorContextProvider>
      </TimeRangeIdContextProvider>
    </ApmPluginContext.Provider>
  );
}
