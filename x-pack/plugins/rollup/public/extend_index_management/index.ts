/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { get } from 'lodash';

const propertyPath = 'isRollupIndex';
export const rollupToggleExtension = {
  matchIndex: (index: { isRollupIndex: boolean }) => {
    return get(index, propertyPath);
  },
  label: i18n.translate('xpack.rollupJobs.indexMgmtToggle.toggleLabel', {
    defaultMessage: 'Include rollup indices',
  }),
  name: 'rollupToggle',
};

export const rollupBadgeExtension = {
  matchIndex: (index: { isRollupIndex: boolean }) => {
    return get(index, propertyPath);
  },
  label: i18n.translate('xpack.rollupJobs.indexMgmtBadge.rollupLabel', {
    defaultMessage: 'Rollup',
  }),
  color: 'success',
  filterExpression: 'isRollupIndex:true',
};
