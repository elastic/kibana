/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
//Prefer importing entire lodash library, e.g. import { get } from "lodash"
// eslint-disable-next-line no-restricted-imports
import { startCase } from 'lodash/fp';

export const COMPLETE_WITHOUT_ACTIVATING = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepScheduleRule.completeWithoutActivatingTitle',
  {
    defaultMessage: 'Create rule without activating it',
  }
);

export const COMPLETE_WITH_ACTIVATING = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepScheduleRule.completeWithActivatingTitle',
  {
    defaultMessage: 'Create & activate rule',
  }
);

export const NO_CONNECTOR_SELECTED = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepRuleActions.noConnectorSelectedErrorMessage',
  {
    defaultMessage: 'No connector selected',
  }
);

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
