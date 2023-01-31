/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { intersection } from 'lodash';
import { i18n } from '@kbn/i18n';

const publicUrlWarning = i18n.translate(
  'xpack.triggersActionsUI.sections.actionTypeForm.warning.publicUrl',
  {
    defaultMessage: 'Kibana missing publicUrl environment variable. Action will use relative URLs.',
  }
);

export function validateParamsForWarnings(
  actionParams: Record<string, unknown>,
  publicBaseUrl: string | undefined
): {
  warnings: Record<string, any>;
} {
  const publicUrlFields = ['context.alertDetailsUrl', 'context.viewInAppUrl'];
  const mustacheRegex = /[^{\}]+(?=}})/g;
  const warnings: Record<string, any> = {
    message: '',
    comments: '',
    description: '',
    note: '',
  };
  const validationResult = { warnings };
  if (!publicBaseUrl && actionParams) {
    for (const key of Object.keys(warnings)) {
      if (actionParams[key]) {
        const contextVariables = (actionParams[key] as string).match(mustacheRegex);
        if (intersection(contextVariables, publicUrlFields).length > 0) {
          warnings[key] = publicUrlWarning;
        }
      }
    }
  }
  return validationResult;
}
