/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* istanbul ignore file */

import { i18n } from '@kbn/i18n';

import { OptionalFieldLabel } from '../optional_field_label';
import { FormSchema } from '../../../../shared_imports';

export const schema: FormSchema = {
  interval: {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepScheduleRule.fieldIntervalLabel',
      {
        defaultMessage: 'Runs every',
      }
    ),
    helpText: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepScheduleRule.fieldIntervalHelpText',
      {
        defaultMessage: 'Rules run periodically and detect alerts within the specified time frame.',
      }
    ),
  },
  from: {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepScheduleRule.fieldAdditionalLookBackLabel',
      {
        defaultMessage: 'Additional look-back time',
      }
    ),
    labelAppend: OptionalFieldLabel,
    helpText: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepScheduleRule.fieldAdditionalLookBackHelpText',
      {
        defaultMessage: 'Adds time to the look-back period to prevent missed alerts.',
      }
    ),
  },
};
