/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  createAction,
  ACTION_CATEGORIZE_FIELD,
  type CategorizeFieldContext,
} from '@kbn/ui-actions-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import { showCategorizeFlyout } from './shared_flyout';

export const categorizeFieldAction = (
  coreStart: CoreStart,
  data: DataPublicPluginStart,
  charts: ChartsPluginStart
) =>
  createAction<CategorizeFieldContext>({
    type: ACTION_CATEGORIZE_FIELD,
    id: ACTION_CATEGORIZE_FIELD,
    getDisplayName: () =>
      i18n.translate('xpack.lens.discover.visualizeFieldLegend', {
        defaultMessage: 'Categorize field',
      }),
    isCompatible: async ({ field }: CategorizeFieldContext) => {
      return field.esTypes?.includes('text') === true;
    },
    execute: async (context: CategorizeFieldContext) => {
      const { field, dataView, onAddDSLFilter } = context;
      showCategorizeFlyout(field, dataView, coreStart, data, charts, onAddDSLFilter);
    },
  });
