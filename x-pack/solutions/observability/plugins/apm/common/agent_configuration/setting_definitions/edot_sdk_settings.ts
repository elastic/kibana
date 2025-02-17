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
    key: 'my_test_config',
    type: 'text',
    defaultValue: '',
    label: i18n.translate('xpack.apm.agentConfig.testConfig.label', {
      defaultMessage: 'My Test config packages',
    }),
    description: i18n.translate('xpack.apm.agentConfig.testConfig.description', {
      defaultMessage:
        'This is some test config',
    }),
    includeAgents: ['opentelemetry/java/elastic'],
  },
];
