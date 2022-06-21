/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { MapToColumnsExpressionFunction } from './types';

export const mapToColumns: MapToColumnsExpressionFunction = {
  name: 'lens_map_to_columns',
  type: 'datatable',
  help: i18n.translate('xpack.lens.functions.mapToColumns.help', {
    defaultMessage: 'A helper to transform a datatable to match Lens column definitions',
  }),
  args: {
    idMap: {
      types: ['string'],
      help: i18n.translate('xpack.lens.functions.mapToColumns.idMap.help', {
        defaultMessage:
          'A JSON encoded object in which keys are the datatable column ids and values are the Lens column definitions. Any datatable columns not mentioned within the ID map will be kept unmapped.',
      }),
    },
  },
  inputTypes: ['datatable'],
  async fn(...args) {
    /** Build optimization: prevent adding extra code into initial bundle **/
    const { mapToOriginalColumns } = await import('./map_to_columns_fn');
    return mapToOriginalColumns(...args);
  },
};
