/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { CoreSetup } from '@kbn/core/public';
import { APMThroughputChartEmbeddableFactoryDefinition } from './throughput_chart/embeddable_factory';
import { APMLatencyChartEmbeddableFactoryDefinition } from './latency_chart/embeddable_factory';
import { APMAlertingLatencyChartEmbeddableFactoryDefinition } from './alerting/alerting_latency_chart/embeddable_factory';
import { APMAlertingThroughputChartEmbeddableFactoryDefinition } from './alerting/alerting_throughput_chart/embeddable_factory';
import { APMAlertingFailedTransactionsChartEmbeddableFactoryDefinition } from './alerting/alerting_failed_transactions_chart/embeddable_factory';
import { ApmPluginStartDeps, ApmPluginStart } from '../plugin';
import { EmbeddableDeps } from './types';

const embeddableFactories = [
  APMThroughputChartEmbeddableFactoryDefinition,
  APMLatencyChartEmbeddableFactoryDefinition,
  APMAlertingLatencyChartEmbeddableFactoryDefinition,
  APMAlertingThroughputChartEmbeddableFactoryDefinition,
  APMAlertingFailedTransactionsChartEmbeddableFactoryDefinition,
];

export function registerEmbeddables(
  deps: Omit<EmbeddableDeps, 'coreStart' | 'pluginsStart'>
) {
  embeddableFactories.forEach((FactoryDefinition) => {
    const factory = new FactoryDefinition(
      deps.coreSetup as CoreSetup<ApmPluginStartDeps, ApmPluginStart>,
      deps.pluginsSetup,
      deps.config,
      deps.kibanaEnvironment,
      deps.observabilityRuleTypeRegistry
    );
    deps.pluginsSetup.embeddable.registerEmbeddableFactory(
      factory.type,
      factory
    );
  });
}
