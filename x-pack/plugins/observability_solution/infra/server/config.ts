/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

import { offeringBasedSchema, schema } from '@kbn/config-schema';
import { PluginConfigDescriptor } from '@kbn/core-plugins-server';
import { ConfigDeprecation } from '@kbn/config';
import { InfraConfig } from './types';
import { publicConfigKeys } from '../common/plugin_config_types';

export type { InfraConfig };

export const config: PluginConfigDescriptor<InfraConfig> = {
  schema: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
    alerting: schema.object({
      inventory_threshold: schema.object({
        group_by_page_size: schema.number({ defaultValue: 5_000 }),
      }),
      metric_threshold: schema.object({
        group_by_page_size: schema.number({ defaultValue: 10_000 }),
      }),
    }),
    inventory: schema.object({
      compositeSize: schema.number({ defaultValue: 2000 }),
    }),
    sources: schema.maybe(
      schema.object({
        default: schema.maybe(
          schema.object({
            fields: schema.maybe(
              schema.object({
                message: schema.maybe(schema.arrayOf(schema.string())),
              })
            ),
          })
        ),
      })
    ),
    featureFlags: schema.object({
      customThresholdAlertsEnabled: offeringBasedSchema({
        traditional: schema.boolean({ defaultValue: false }),
        serverless: schema.boolean({ defaultValue: false }),
      }),
      logsUIEnabled: offeringBasedSchema({
        traditional: schema.boolean({ defaultValue: true }),
        serverless: schema.boolean({ defaultValue: false }),
      }),
      metricsExplorerEnabled: offeringBasedSchema({
        traditional: schema.boolean({ defaultValue: true }),
        serverless: schema.boolean({ defaultValue: false }),
      }),
      osqueryEnabled: schema.boolean({ defaultValue: true }),
      inventoryThresholdAlertRuleEnabled: offeringBasedSchema({
        traditional: schema.boolean({ defaultValue: true }),
        serverless: schema.boolean({ defaultValue: true }),
      }),
      metricThresholdAlertRuleEnabled: offeringBasedSchema({
        traditional: schema.boolean({ defaultValue: true }),
        serverless: schema.boolean({ defaultValue: false }),
      }),
      logThresholdAlertRuleEnabled: offeringBasedSchema({
        traditional: schema.boolean({ defaultValue: true }),
        serverless: schema.boolean({ defaultValue: false }),
      }),
      alertsAndRulesDropdownEnabled: offeringBasedSchema({
        traditional: schema.boolean({ defaultValue: true }),
        serverless: schema.boolean({ defaultValue: true }),
      }),
      /**
       * Depends on optional "profilingDataAccess" and "profiling"
       * plugins. Enable both with `xpack.profiling.enabled: true` before
       * enabling this feature flag.
       */
      profilingEnabled: schema.boolean({ defaultValue: false }),
      ruleFormV2Enabled: schema.boolean({ defaultValue: false }),
    }),
  }),
  deprecations: () => [sourceFieldsMessageDeprecation],
  exposeToBrowser: publicConfigKeys,
};

const sourceFieldsMessageDeprecation: ConfigDeprecation = (settings, fromPath, addDeprecation) => {
  const sourceFieldsMessageSetting = settings?.xpack?.infra?.sources?.default?.fields?.message;

  if (sourceFieldsMessageSetting) {
    addDeprecation({
      configPath: `${fromPath}.sources.default.fields.message`,
      title: i18n.translate('xpack.infra.deprecations.sourcesDefaultFieldsMessage.title', {
        defaultMessage: 'The "xpack.infra.sources.default.fields.message" setting is deprecated.',
        ignoreTag: true,
      }),
      message: i18n.translate('xpack.infra.deprecations.sourcesDefaultFieldsMessage.message', {
        defaultMessage:
          'Features using this configurations are set to be removed in v9 and this is no longer used.',
      }),
      level: 'warning',
      documentationUrl: `https://www.elastic.co/guide/en/kibana/current/logs-ui-settings-kb.html#general-logs-ui-settings-kb`,
      correctiveActions: {
        manualSteps: [
          i18n.translate('xpack.infra.deprecations.sourcesDefaultFieldsMessage.manualSteps1', {
            defaultMessage: 'Remove "xpack.infra.sources.default.fields.message" from kibana.yml.',
            ignoreTag: true,
          }),
        ],
      },
    });
  }
};
