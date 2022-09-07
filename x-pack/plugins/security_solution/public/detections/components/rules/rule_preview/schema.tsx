/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* istanbul ignore file */

import { i18n } from '@kbn/i18n';

import { OptionalFieldLabel } from '../optional_field_label';
import type { AdvancedPreviewForm } from '../../../pages/detection_engine/rules/types';
import type { FormSchema } from '../../../../shared_imports';

export const schema: FormSchema<AdvancedPreviewForm> = {
  interval: {
    label: i18n.translate('xpack.securitySolution.detectionEngine.previewRule.fieldIntervalLabel', {
      defaultMessage: 'Runs every (Rule interval)',
    }),
    helpText: i18n.translate(
      'xpack.securitySolution.detectionEngine.previewRule.fieldIntervalHelpText',
      {
        defaultMessage: 'Rules run periodically and detect alerts within the specified time frame.',
      }
    ),
  },
  lookback: {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.previewRule.fieldAdditionalLookBackLabel',
      {
        defaultMessage: 'Additional look-back time',
      }
    ),
    labelAppend: OptionalFieldLabel,
    helpText: i18n.translate(
      'xpack.securitySolution.detectionEngine.previewRule.fieldAdditionalLookBackHelpText',
      {
        defaultMessage: 'Adds time to the look-back period to prevent missed alerts.',
      }
    ),
  },
};
