/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import {
  addToggleExtension,
  addBadgeExtension
} from '../../../index_management/public/index_management_extensions';
import { get } from 'lodash';

const propertyPath = 'isRollupIndex';
export const rollupToggleExtension = {
  matchIndex: (index) => {
    return get(index, propertyPath);
  },
  label: i18n.translate('xpack.rollupJobs.indexMgmtToggle.toggleLabel', {
    defaultMessage: 'Include rollup indices',
  }),
  name: 'rollupToggle'
};
export const rollupBadgeExtension = {
  matchIndex: (index) => {
    return get(index, propertyPath);
  },
  label: i18n.translate('xpack.rollupJobs.indexMgmtBadge.rollupLabel', {
    defaultMessage: 'Rollup',
  }),
};

addBadgeExtension(rollupBadgeExtension);
addToggleExtension(rollupToggleExtension);

