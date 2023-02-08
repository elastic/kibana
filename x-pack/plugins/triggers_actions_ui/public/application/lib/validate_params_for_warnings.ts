/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { intersection } from 'lodash';
import { i18n } from '@kbn/i18n';
import { ActionVariable, RuleActionParam } from '@kbn/alerting-plugin/common';

const publicUrlWarning = i18n.translate(
  'xpack.triggersActionsUI.sections.actionTypeForm.warning.publicUrl',
  {
    defaultMessage: 'server.publicBaseUrl is not set. Actions will use relative URLs.',
  }
);

export function validateParamsForWarnings(
  value: RuleActionParam,
  publicBaseUrl: string | undefined,
  actionVariables: ActionVariable[] | undefined
): string | null {
  const mustacheRegex = /[^{\}]+(?=}})/g;
  if (!publicBaseUrl && value && typeof value === 'string') {
    const publicUrlFields = (actionVariables || [])
      .filter((v) => v.usesPublicBaseUrl)
      .map((v) => v.name);

    const contextVariables = value.match(mustacheRegex);
    if (intersection(contextVariables, publicUrlFields).length > 0) {
      return publicUrlWarning;
    }
  }
  return null;
}
