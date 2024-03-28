/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EmbeddableSetup } from '@kbn/embeddable-plugin/public';
import { CoreSetup } from '@kbn/core/public';
import { APMThroughputChartEmbeddableFactoryDefinition } from './throughput_chart/embeddable_factory';
import { APMLatencyChartEmbeddableFactoryDefinition } from './latency_chart/embeddable_factory';
import { APMAlertingLatencyChartEmbeddableFactoryDefinition } from './alerting/alerting_latency_chart/embeddable_factory';
import { APMAlertingThroughputChartEmbeddableFactoryDefinition } from './alerting/alerting_throughput_chart/embeddable_factory';
import { APMAlertingFailedTransactionsChartEmbeddableFactoryDefinition } from './alerting/alerting_failed_transactions_chart/embeddable_factory';

const embeddableFactories = [
  APMThroughputChartEmbeddableFactoryDefinition,
  APMLatencyChartEmbeddableFactoryDefinition,
  APMAlertingLatencyChartEmbeddableFactoryDefinition,
  APMAlertingThroughputChartEmbeddableFactoryDefinition,
  APMAlertingFailedTransactionsChartEmbeddableFactoryDefinition,
];

export function registerEmbeddables(
  core: CoreSetup,
  plugins: { embeddable: EmbeddableSetup }
) {
  embeddableFactories.forEach((FactoryDefinition) => {
    const factory = new FactoryDefinition(core.getStartServices, plugins);
    plugins.embeddable.registerEmbeddableFactory(factory.type, factory);
  });
}
