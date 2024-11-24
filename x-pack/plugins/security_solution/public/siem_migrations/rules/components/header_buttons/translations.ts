/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SIEM_MIGRATIONS_OPTION_AREAL_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.selectionOption.arealLabel',
  {
    defaultMessage: 'Select a migration',
  }
);

export const SIEM_MIGRATIONS_OPTION_LABEL = (optionIndex: number) =>
  i18n.translate('xpack.securitySolution.siemMigrations.rules.selectionOption.title', {
    defaultMessage: 'SIEM rule migration {optionIndex}',
    values: {
      optionIndex,
    },
  });
