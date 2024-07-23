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
  const registerApmAlertingLatencyChartEmbeddable = async () => {
    const { getApmAlertingLatencyChartEmbeddableFactory, APM_ALERTING_LATENCY_CHART_EMBEDDABLE } =
      await import('./alerting/alerting_latency_chart/react_embeddable_factory');
    registerReactEmbeddableFactory(APM_ALERTING_LATENCY_CHART_EMBEDDABLE, async () => {
      return getApmAlertingLatencyChartEmbeddableFactory({ ...deps, coreStart, pluginsStart });
    });
  };
  const registerApmAlertingThroughputChartEmbeddable = async () => {
    const {
      getApmAlertingThroughputChartEmbeddableFactory,
      APM_ALERTING_THROUGHPUT_CHART_EMBEDDABLE,
    } = await import('./alerting/alerting_throughput_chart/react_embeddable_factory');
    registerReactEmbeddableFactory(APM_ALERTING_THROUGHPUT_CHART_EMBEDDABLE, async () => {
      return getApmAlertingThroughputChartEmbeddableFactory({ ...deps, coreStart, pluginsStart });
    });
  };
  const registerApmAlertingFailedTransactionsChartEmbeddable = async () => {
    const {
      getApmAlertingFailedTransactionsChartEmbeddableFactory,
      APM_ALERTING_FAILED_TRANSACTIONS_CHART_EMBEDDABLE,
    } = await import('./alerting/alerting_failed_transactions_chart/react_embeddable_factory');
    registerReactEmbeddableFactory(APM_ALERTING_FAILED_TRANSACTIONS_CHART_EMBEDDABLE, async () => {
      return getApmAlertingFailedTransactionsChartEmbeddableFactory({
        ...deps,
        coreStart,
        pluginsStart,
      });
    });
  };
  registerApmAlertingLatencyChartEmbeddable();
  registerApmAlertingThroughputChartEmbeddable();
  registerApmAlertingFailedTransactionsChartEmbeddable();
}
