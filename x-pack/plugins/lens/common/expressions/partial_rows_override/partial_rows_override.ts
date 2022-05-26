/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { PartialRowsOverrideExpressionFunction } from './types';

export const partialRowsOverride: PartialRowsOverrideExpressionFunction = {
  name: 'lens_partialRows_override',
  type: 'datatable',
  help: i18n.translate('xpack.lens.functions.renameColumns.help', {
    defaultMessage: 'A helper to rename the columns of a datatable',
  }),
  args: {},
  inputTypes: ['datatable'],
  async fn(...args) {
    /** Build optimization: prevent adding extra code into initial bundle **/
    const { partialRowsOverrideFn } = await import('./partial_rows_override_fn');
    return partialRowsOverrideFn(...args);
  },
};
