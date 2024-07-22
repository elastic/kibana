/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { CoreSetup } from '@kbn/core/public';

import { ApmPluginStartDeps, ApmPluginStart } from '../plugin';
import { EmbeddableDeps } from './types';

export async function registerEmbeddables(
  deps: Omit<EmbeddableDeps, 'coreStart' | 'pluginsStart'>
) {
  const coreSetup = deps.coreSetup as CoreSetup<ApmPluginStartDeps, ApmPluginStart>;
  const pluginsSetup = deps.pluginsSetup;
  const [coreStart, pluginsStart] = await coreSetup.getStartServices();
  const registerReactEmbeddableFactory = pluginsSetup.embeddable.registerReactEmbeddableFactory;
  const registerAPMAlertingChartEmbeddable = async () => {
    const { getApmLatencyChartEmbeddableFactory, APM_LATENCY_CHART_EMBEDDABLE } = await import(
      './latency_chart/react_embeddable_factory'
    );
    registerReactEmbeddableFactory(APM_LATENCY_CHART_EMBEDDABLE, async () => {
      return getApmLatencyChartEmbeddableFactory({ ...deps, coreStart, pluginsStart });
    });
  };
  const registerAPMThroughputChartEmbeddable = async () => {
    const { getApmThroughputChartEmbeddableFactory, APM_THROUGHPUT_CHART_EMBEDDABLE } =
      await import('./throughput_chart/react_embeddable_factory');
    registerReactEmbeddableFactory(APM_THROUGHPUT_CHART_EMBEDDABLE, async () => {
      return getApmThroughputChartEmbeddableFactory({ ...deps, coreStart, pluginsStart });
    });
  };
  const registerAPMFailedTransactionsChartEmbeddable = async () => {
    const {
      getApmFailedTransactionsChartEmbeddableFactory,
      APM_FAILED_TRANSACTIONS_CHART_EMBEDDABLE,
    } = await import('./failed_transactions_chart/react_embeddable_factory');
    registerReactEmbeddableFactory(APM_FAILED_TRANSACTIONS_CHART_EMBEDDABLE, async () => {
      return getApmFailedTransactionsChartEmbeddableFactory({
        ...deps,
        coreStart,
        pluginsStart,
      });
    });
  };
  registerAPMAlertingChartEmbeddable();
  registerAPMThroughputChartEmbeddable();
  registerAPMFailedTransactionsChartEmbeddable();
}
