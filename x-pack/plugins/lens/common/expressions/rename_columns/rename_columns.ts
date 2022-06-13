/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { MapToOriginalColumnsExpressionFunction } from './types';

export const renameColumns: MapToOriginalColumnsExpressionFunction = {
  name: 'lens_map_to_original_columns',
  type: 'datatable',
  help: i18n.translate('xpack.lens.functions.renameColumns.help', {
    defaultMessage: 'A helper to rename the columns of a datatable',
  }),
  args: {
    idMap: {
      types: ['string'],
      help: i18n.translate('xpack.lens.functions.renameColumns.idMap.help', {
        defaultMessage:
          'A JSON encoded object in which keys are the old column ids and values are the corresponding new ones. All other columns ids are kept.',
      }),
    },
  },
  inputTypes: ['datatable'],
  async fn(...args) {
    /** Build optimization: prevent adding extra code into initial bundle **/
    const { mapToOriginalColumns } = await import('./rename_columns_fn');
    return mapToOriginalColumns(...args);
  },
};
