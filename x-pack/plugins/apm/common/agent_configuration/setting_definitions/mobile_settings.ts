/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { RawSettingDefinition } from './types';

export const mobileSettings: RawSettingDefinition[] = [
  {
    key: 'enable_automatic_instrumentation',
    type: 'boolean',
    defaultValue: 'true',
    label: i18n.translate(
      'xpack.apm.agentConfig.enableAutomaticInstrumentation.label',
      {
        defaultMessage: 'Enable automatic instrumentation',
      }
    ),
    description: i18n.translate(
      'xpack.apm.agentConfig.enableAutomaticInstrumentation.description',
      {
        defaultMessage:
          'Specifies if the agent should automatically trace its supported technologies. If set to `false`, only manually collected APM data will be sent over to the APM server.',
      }
    ),
    includeAgents: ['android/java'],
  },
];
