/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { RawSettingDefinition } from './types';

export const edotSDKSettings: RawSettingDefinition[] = [
  {
    key: 'disable_instrumentations',
    type: 'text',
    defaultValue: '',
    label: i18n.translate('xpack.apm.agentConfig.disableInstrumentations.label', {
      defaultMessage: 'Disable instrumentations',
    }),
    description: i18n.translate('xpack.apm.agentConfig.disableInstrumentations.description', {
      defaultMessage:
        'Comma-separated list of modules to disable instrumentation for.\n' +
        'When instrumentation is disabled for a module, no spans will be collected for that module.\n' +
        '\n' +
        'The up-to-date list of modules for which instrumentation can be disabled is language specific ' +
        'and can be found under the following links: ' +
        '[opentelemetry/java/elastic](https://opentelemetry.io/docs/zero-code/java/agent/disable/#suppressing-specific-agent-instrumentation)',
    }),
    includeAgents: ['opentelemetry/java/elastic'],
  },
];
