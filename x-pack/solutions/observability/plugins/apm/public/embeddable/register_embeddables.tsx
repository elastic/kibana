/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreSetup } from '@kbn/core/public';
import { ADD_PANEL_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import {
  APM_ALERTING_FAILED_TRANSACTIONS_CHART_EMBEDDABLE,
  APM_ALERTING_LATENCY_CHART_EMBEDDABLE,
  APM_ALERTING_THROUGHPUT_CHART_EMBEDDABLE,
} from '@kbn/apm-embeddable-common';
import type { ApmPluginStartDeps, ApmPluginStart } from '../plugin';
import type { EmbeddableDeps } from './types';
import {
  ADD_APM_SERVICE_MAP_PANEL_ACTION_ID,
  APM_SERVICE_MAP_EMBEDDABLE,
} from './service_map/constants';

export async function registerEmbeddables(
  deps: Omit<EmbeddableDeps, 'coreStart' | 'pluginsStart'>
) {
  const coreSetup = deps.coreSetup as CoreSetup<ApmPluginStartDeps, ApmPluginStart>;
  const pluginsSetup = deps.pluginsSetup;
  const [coreStart, pluginsStart] = await coreSetup.getStartServices();
  const registerEmbeddablePublicDefinition =
    pluginsSetup.embeddable.registerEmbeddablePublicDefinition;

  registerEmbeddablePublicDefinition(APM_ALERTING_LATENCY_CHART_EMBEDDABLE, async () => {
    const { getApmAlertingLatencyChartEmbeddableFactory } = await import(
      './alerting/alerting_latency_chart/react_embeddable_factory'
    );

    return getApmAlertingLatencyChartEmbeddableFactory({ ...deps, coreStart, pluginsStart });
  });

  registerEmbeddablePublicDefinition(APM_ALERTING_THROUGHPUT_CHART_EMBEDDABLE, async () => {
    const { getApmAlertingThroughputChartEmbeddableFactory } = await import(
      './alerting/alerting_throughput_chart/react_embeddable_factory'
    );

    return getApmAlertingThroughputChartEmbeddableFactory({ ...deps, coreStart, pluginsStart });
  });

  registerEmbeddablePublicDefinition(
    APM_ALERTING_FAILED_TRANSACTIONS_CHART_EMBEDDABLE,
    async () => {
      const { getApmAlertingFailedTransactionsChartEmbeddableFactory } = await import(
        './alerting/alerting_failed_transactions_chart/react_embeddable_factory'
      );

      return getApmAlertingFailedTransactionsChartEmbeddableFactory({
        ...deps,
        coreStart,
        pluginsStart,
      });
    }
  );

  registerEmbeddablePublicDefinition(APM_SERVICE_MAP_EMBEDDABLE, async () => {
    const { getServiceMapEmbeddableFactory } = await import(
      './service_map/service_map_embeddable_factory'
    );

    return getServiceMapEmbeddableFactory({ ...deps, coreStart, pluginsStart });
  });

  pluginsSetup.uiActions.addTriggerActionAsync(
    ADD_PANEL_TRIGGER,
    ADD_APM_SERVICE_MAP_PANEL_ACTION_ID,
    async () => {
      const { createAddServiceMapPanelAction } = await import(
        './service_map/create_add_service_map_panel_action'
      );
      return createAddServiceMapPanelAction({ ...deps, coreStart, pluginsStart });
    }
  );
}
