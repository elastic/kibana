/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { CollapseExpressionFunction } from './types';

export type CollapseFunction = 'sum' | 'avg' | 'min' | 'max';
export interface CollapseArgs {
  by?: string[];
  metric?: string[];
  fn: CollapseFunction[];
}

export type { CollapseExpressionFunction };

/**
 * Collapses multiple rows into a single row using the specified function.
 *
 * The `by` argument specifies the columns to group by - these columns are not collapsed.
 * The `metric` arguments specifies the collumns to apply the aggregate function to.
 *
 * All other columns are removed.
 */
export const collapse: CollapseExpressionFunction = {
  name: 'lens_collapse',
  type: 'datatable',

  inputTypes: ['datatable'],

  help: i18n.translate('xpack.lens.functions.collapse.help', {
    defaultMessage:
      'Collapses multiple rows into a single row using the specified aggregate function.',
  }),

  args: {
    by: {
      help: i18n.translate('xpack.lens.functions.collapse.args.byHelpText', {
        defaultMessage: 'Columns to group by - these columns are kept as-is',
      }),
      multi: true,
      types: ['string'],
      required: false,
    },
    metric: {
      help: i18n.translate('xpack.lens.functions.collapse.args.metricHelpText', {
        defaultMessage: 'Column to calculate the specified aggregate function of',
      }),
      types: ['string'],
      multi: true,
      required: false,
    },
    fn: {
      help: i18n.translate('xpack.lens.functions.collapse.args.fnHelpText', {
        defaultMessage: 'The aggregate function to apply',
      }),
      types: ['string'],
      multi: true,
      required: true,
    },
  },

  async fn(...args) {
    /** Build optimization: prevent adding extra code into initial bundle **/
    const { collapseFn } = await import('./collapse_fn');
    return collapseFn(...args);
  },
};
