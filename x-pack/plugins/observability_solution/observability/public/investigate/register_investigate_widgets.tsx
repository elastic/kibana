/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { CoreSetup } from '@kbn/core/public';
import useAsync from 'react-use/lib/useAsync';
import { ChromeOption } from '@kbn/investigate-plugin/public';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { RegisterWidget } from '@kbn/investigate-plugin/public/types';
import type { ObservabilityPublicPluginsStart, ObservabilityPublicPluginsSetup } from '../plugin';
import { ALERTS_INVENTORY_WIDGET_NAME } from './investigate_alerts_inventory/constants';
import { SharedProviders } from '../application/shared_providers';
import { InvestigateAlertsInventory } from './investigate_alerts_inventory';
import { ALERTS_DETAIL_WIDGET_NAME } from './investigate_alerts_detail/constants';
import { InvestigateAlertsDetail } from './investigate_alerts_detail';
import type { ObservabilityRuleTypeRegistry } from '../rules/create_observability_rule_type_registry';
import { ConfigSchema } from '../plugin';
import { ALERT_LOG_RATE_ANALYSIS_WIDGET_NAME } from './investigate_alerts_log_rate_analysis/constants';
import { InvestigateAlertsLogRateAnalysis } from './investigate_alerts_log_rate_analysis';

interface RegisterInvestigateWidgetOptions {
  coreSetup: CoreSetup<ObservabilityPublicPluginsStart>;
  pluginsSetup: ObservabilityPublicPluginsSetup;
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry;
  config: ConfigSchema;
  kibanaVersion: string;
  isDev: boolean;
  registerWidget: RegisterWidget;
}

export function registerInvestigateWidgets(options: RegisterInvestigateWidgetOptions) {
  function WithContext({ children }: { children: React.ReactNode }) {
    const startServicesAsync = useAsync(async () => {
      return await options.coreSetup.getStartServices();
    }, []);

    const [coreStart, pluginsStart] = startServicesAsync.value ?? [undefined, undefined];

    if (!coreStart || !pluginsStart) {
      return null;
    }

    return (
      <SharedProviders
        coreStart={coreStart}
        pluginsStart={pluginsStart}
        kibanaVersion={options.kibanaVersion}
        isDev={options.isDev}
        observabilityRuleTypeRegistry={options.observabilityRuleTypeRegistry}
        ObservabilityPageTemplate={pluginsStart.observabilityShared.navigation.PageTemplate}
        config={options.config}
      >
        {children}
      </SharedProviders>
    );
  }

  options.registerWidget(
    {
      type: ALERTS_INVENTORY_WIDGET_NAME,
      description: 'Displays an overview of recently active and recovered alerts',
      chrome: ChromeOption.static,
      schema: {
        type: 'object',
        properties: {
          relatedAlertUuid: {
            type: 'string',
            description: 'If specified, the table will display related alerts to this alert',
          },
          activeOnly: {
            type: 'boolean',
            description: 'If true, only active alerts will be shown, without recovered alerts',
          },
        },
      },
    },
    async () => {
      return {};
    },
    ({ widget, onWidgetAdd }) => {
      const { filters, query, timeRange, relatedAlertUuid, activeOnly } = widget.parameters;

      return (
        <WithContext>
          <InvestigateAlertsInventory
            onWidgetAdd={onWidgetAdd}
            filters={filters}
            query={query}
            timeRange={timeRange}
            relatedAlertUuid={relatedAlertUuid}
            activeOnly={activeOnly}
          />
        </WithContext>
      );
    }
  );

  options.registerWidget(
    {
      type: ALERTS_DETAIL_WIDGET_NAME,
      description: 'Displays detailed information about a specific alert',
      chrome: ChromeOption.static,
      schema: {
        type: 'object',
        properties: {
          alertUuid: {
            type: 'string',
            description: 'The instance ID of the alert',
          },
        },
        required: ['alertUuid'],
      } as const,
    },
    async () => {
      return {};
    },
    ({ widget, onWidgetAdd, blocks }) => {
      const { filters, query, timeRange, alertUuid } = widget.parameters;

      return (
        <WithContext>
          <InvestigateAlertsDetail
            filters={filters}
            query={query}
            timeRange={timeRange}
            alertUuid={alertUuid}
            blocks={blocks}
            onWidgetAdd={onWidgetAdd}
          />
        </WithContext>
      );
    }
  );

  options.registerWidget(
    {
      type: ALERT_LOG_RATE_ANALYSIS_WIDGET_NAME,
      description: 'Analyse metadata that could be related to triggering the alert',
      chrome: ChromeOption.static,
      schema: {
        type: 'object',
        properties: {
          alertUuid: {
            type: 'string',
            description: 'The instance ID of the alert',
          },
          logRateQuery: {
            type: 'object',
            description:
              'The Query DSL for analyzing log rates, e.g. { bool: { filter: [ ... ] } }',
          },
          indexPattern: {
            type: 'string',
            description: 'The index pattern to run the query against',
          },
        },
        required: ['alertUuid', 'query', 'indexPattern'],
      } as const,
    },
    async () => {
      return {};
    },
    ({ widget, onWidgetAdd, blocks }) => {
      const { alertUuid, logRateQuery, indexPattern } = widget.parameters;

      return (
        <WithContext>
          <InvestigateAlertsLogRateAnalysis
            alertUuid={alertUuid}
            blocks={blocks}
            onWidgetAdd={onWidgetAdd}
            query={logRateQuery as QueryDslQueryContainer}
            indexPattern={indexPattern}
          />
        </WithContext>
      );
    }
  );
}
