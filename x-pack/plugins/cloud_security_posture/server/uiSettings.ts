/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import { CoreSetup } from '../../../../src/core/server';
import { SECURITY_SOLUTION_APP_ID } from './constants';
import { ENABLE_CSP } from '../common/constants';

export const initUiSettings = (uiSettings: CoreSetup['uiSettings']) => {
  uiSettings.register({
    [ENABLE_CSP]: {
      name: i18n.translate('xpack.securitySolution.uiSettings.enableCloudSecurityPosture', {
        defaultMessage: 'Cloud Security',
      }),
      value: false,
      description: `${i18n.translate(
        'xpack.securitySolution.uiSettings.enableCloudSecurityPostureDescription',
        {
          defaultMessage: '<p>Enables the Cloud Security Posture feature (beta)</p>',
        }
      )}`,
      type: 'boolean',
      category: [SECURITY_SOLUTION_APP_ID],
      requiresPageReload: true,
      schema: schema.boolean(),
    },
  });
};
