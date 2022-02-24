/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { get } from 'lodash';
import { i18n } from '@kbn/i18n';
import { PluginConfigDescriptor, PluginInitializerContext } from 'src/core/server';
import { AlertingBuiltinsPlugin } from './plugin';
import { configSchema, Config } from '../common/config';
export { ID as INDEX_THRESHOLD_ID } from './alert_types/index_threshold/alert_type';

export const config: PluginConfigDescriptor<Config> = {
  exposeToBrowser: {},
  schema: configSchema,
  deprecations: () => [
    (settings, fromPath, addDeprecation) => {
      const stackAlerts = get(settings, fromPath);
      if (stackAlerts?.enabled === false || stackAlerts?.enabled === true) {
        addDeprecation({
          level: 'critical',
          configPath: 'xpack.stack_alerts.enabled',
          title: i18n.translate('xpack.stackAlerts.deprecations.enabledTitle', {
            defaultMessage: 'Setting "xpack.stack_alerts.enabled" is deprecated',
          }),
          message: i18n.translate('xpack.stackAlerts.deprecations.enabledMessage', {
            defaultMessage:
              'This setting will be removed in 8.0 and the Stack Rules plugin will always be enabled.',
          }),
          documentationUrl: `https://www.elastic.co/guide/en/kibana/current/kibana-privileges.html#kibana-feature-privileges`,
          correctiveActions: {
            manualSteps: [
              i18n.translate('xpack.stackAlerts.deprecations.enabled.manualStepOneMessage', {
                defaultMessage: 'Remove "xpack.stack_alerts.enabled" from kibana.yml.',
              }),
              i18n.translate('xpack.stackAlerts.deprecations.enabled.manualStepTwoMessage', {
                defaultMessage: 'Use Kibana feature privileges to restrict access to Stack Rules.',
              }),
            ],
          },
        });
      }
    },
  ],
};

export const plugin = (ctx: PluginInitializerContext) => new AlertingBuiltinsPlugin(ctx);
