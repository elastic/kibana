/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { CoreSetup } from '@kbn/core/public';
import { registerReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import {
  getApmThroughputEmbeddableFactory,
  APM_ALERTING_THROUGHPUT_CHART_EMBEDDABLE,
} from './alerting/alerting_throughput_chart/react_embeddable_factory';
import {
  getApmLatencyChartEmbeddableFactory,
  APM_ALERTING_LATENCY_CHART_EMBEDDABLE,
} from './alerting/alerting_latency_chart/react_embeddable_factory';
import {
  getApmFailedTransactionsChartEmbeddableFactory,
  APM_ALERTING_FAILED_TRANSACTIONS_CHART_EMBEDDABLE,
} from './alerting/alerting_failed_transactions_chart/react_embeddable_factory';
import { ApmPluginStartDeps, ApmPluginStart } from '../plugin';
import { EmbeddableDeps } from './types';

const reactEmeddableFactories = [
  { type: APM_ALERTING_THROUGHPUT_CHART_EMBEDDABLE, factory: getApmThroughputEmbeddableFactory },
  { type: APM_ALERTING_LATENCY_CHART_EMBEDDABLE, factory: getApmLatencyChartEmbeddableFactory },
  {
    type: APM_ALERTING_FAILED_TRANSACTIONS_CHART_EMBEDDABLE,
    factory: getApmFailedTransactionsChartEmbeddableFactory,
  },
];

export function registerEmbeddables(deps: Omit<EmbeddableDeps, 'coreStart' | 'pluginsStart'>) {
  const coreSetup = deps.coreSetup as CoreSetup<ApmPluginStartDeps, ApmPluginStart>;
  reactEmeddableFactories.forEach(({ type, factory }) => {
    registerReactEmbeddableFactory(type, async () => {
      const [coreStart, pluginsStart] = await coreSetup.getStartServices();
      const stuff = factory({ ...deps, coreStart, pluginsStart });
      return stuff;
    });
  });
}
