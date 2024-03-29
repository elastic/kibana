/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { CoreSetup } from '@kbn/core/public';
import {
  IContainer,
  EmbeddableFactoryDefinition,
  EmbeddableFactory,
} from '@kbn/embeddable-plugin/public';
import type { ObservabilityRuleTypeRegistry } from '@kbn/observability-plugin/public';
import {
  APMAlertingLatencyChartEmbeddable,
  APM_ALERTING_LATENCY_CHART_EMBEDDABLE,
} from './embeddable';
import type {
  ApmPluginStartDeps,
  ApmPluginStart,
  ApmPluginSetupDeps,
} from '../../../plugin';
import type { APMAlertingVizEmbeddableInput } from '../types';
import type { ConfigSchema } from '../../..';
import type { KibanaEnvContext } from '../../../context/kibana_environment_context/kibana_environment_context';
import { APMEmbeddableFactoryDefinition } from '../../apm_embeddable_factory';

export type APMAlertingLatencyChartEmbeddableFactory = EmbeddableFactory;
export class APMAlertingLatencyChartEmbeddableFactoryDefinition
  extends APMEmbeddableFactoryDefinition
  implements EmbeddableFactoryDefinition
{
  public readonly type = APM_ALERTING_LATENCY_CHART_EMBEDDABLE;

  constructor(
    coreSetup: CoreSetup<ApmPluginStartDeps, ApmPluginStart>,
    pluginsSetup: ApmPluginSetupDeps,
    config: ConfigSchema,
    kibanaEnvironment: KibanaEnvContext,
    observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry
  ) {
    super(
      coreSetup,
      pluginsSetup,
      config,
      kibanaEnvironment,
      observabilityRuleTypeRegistry
    );
  }

  public async isEditable() {
    return true;
  }

  public async create(
    initialInput: APMAlertingVizEmbeddableInput,
    parent?: IContainer
  ) {
    return this.createInstance(
      APMAlertingLatencyChartEmbeddable,
      initialInput,
      parent
    );
  }

  public getDescription() {
    return i18n.translate('xpack.apm.latencyChartEmbeddable.description', {
      defaultMessage: "Get an overview of your service's latency.",
    });
  }

  public getDisplayName() {
    return i18n.translate('xpack.apm.latencyChartEmbeddable.displayName', {
      defaultMessage: 'APM Service Latency',
    });
  }

  public getIconType() {
    return 'visGauge';
  }
}
