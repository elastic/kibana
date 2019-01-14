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

const propertyPath = 'isRollupIndex';
export const rollupToggleExtension = {
  propertyPath,
  label: i18n.translate('xpack.rollup.indexMgmtToggle.toggleLabel', {
    defaultMessage: 'Include rollup indices',
  }),
};
export const rollupBadgeExtension = {
  propertyPath,
  label: i18n.translate('xpack.rollup.indexMgmtBadge.rollupLabel', {
    defaultMessage: 'Rollup',
  }),
};

addBadgeExtension(rollupBadgeExtension);
addToggleExtension(rollupToggleExtension);

