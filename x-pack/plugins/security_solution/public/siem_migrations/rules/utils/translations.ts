/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SIEM_TRANSLATION_RESULT_FULL_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.translationResult.full',
  {
    defaultMessage: 'Fully translated',
  }
);

export const SIEM_TRANSLATION_RESULT_PARTIAL_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.translationResult.partially',
  {
    defaultMessage: 'Partially translated',
  }
);

export const SIEM_TRANSLATION_RESULT_UNTRANSLATABLE_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.translationResult.untranslatable',
  {
    defaultMessage: 'Not translated',
  }
);

export const SIEM_TRANSLATION_RESULT_UNKNOWN_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.translationResult.unknown',
  {
    defaultMessage: 'Unknown',
  }
);

export const SIEM_TRANSLATION_RESULT_UNKNOWN_ERROR = (status?: string) => {
  return i18n.translate(
    'xpack.securitySolution.siemMigrations.rules.translationResult.unknownError',
    {
      defaultMessage: 'Unknown translation result status: ({status})',
      values: { status },
    }
  );
};
