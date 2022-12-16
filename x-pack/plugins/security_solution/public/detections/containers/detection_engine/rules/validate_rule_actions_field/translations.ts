/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { startCase } from 'lodash/fp';

export const INVALID_MUSTACHE_TEMPLATE = (paramKey: string) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.createRule.stepRuleActions.invalidMustacheTemplateErrorMessage',
    {
      defaultMessage: '{key} is not valid mustache template',
      values: {
        key: startCase(paramKey),
      },
    }
  );
