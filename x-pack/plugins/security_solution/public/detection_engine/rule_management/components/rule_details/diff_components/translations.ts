/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const fieldToDisplayNameMap: Record<string, string> = {
  name: i18n.translate('xpack.securitySolution.detectionEngine.rules.upgradeRuleFields.nameLabel', {
    defaultMessage: 'Name',
  }),
  data_source: i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.upgradeRuleFields.dataSourceLabel',
    {
      defaultMessage: 'Data source',
    }
  ),
  note: i18n.translate('xpack.securitySolution.detectionEngine.rules.upgradeRuleFields.noteLabel', {
    defaultMessage: 'Investigation guide',
  }),
  // TODO: fill the rest of this out
};
