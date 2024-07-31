/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Index } from '@kbn/index-management-plugin/common';
import { ROLLUP_DEPRECATION_BADGE_LABEL } from '@kbn/rollup';

export const rollupToggleExtension = {
  matchIndex: (index: Index) => {
    return Boolean(index.isRollupIndex);
  },
  label: i18n.translate('xpack.rollupJobs.indexMgmtToggle.toggleLabel', {
    defaultMessage: 'Include rollup indices',
  }),
  name: 'rollupToggle',
};

export const rollupBadgeExtension = {
  matchIndex: (index: Index) => {
    return Boolean(index.isRollupIndex);
  },
  label: ROLLUP_DEPRECATION_BADGE_LABEL,
  color: 'warning',
  filterExpression: 'isRollupIndex:true',
};
