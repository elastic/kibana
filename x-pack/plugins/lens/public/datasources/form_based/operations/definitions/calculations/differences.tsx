/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { DIFFERENCES_ID, DIFFERENCES_NAME } from '@kbn/lens-formula-docs';
import { FormattedIndexPatternColumn, ReferenceBasedIndexPatternColumn } from '../column_types';
import { FormBasedLayer } from '../../../types';
import {
  buildLabelFunction,
  checkForDateHistogram,
  getErrorsForDateReference,
  dateBasedOperationToExpression,
  hasDateField,
  checkForDataLayerType,
} from './utils';
import { OperationDefinition } from '..';
import { getFormatFromPreviousColumn, getFilter } from '../helpers';

const ofName = buildLabelFunction((name?: string) => {
  return i18n.translate('xpack.lens.indexPattern.derivativeOf', {
    defaultMessage: 'Differences of {name}',
    values: {
      name:
        name ??
        i18n.translate('xpack.lens.indexPattern.incompleteOperation', {
          defaultMessage: '(incomplete)',
        }),
    },
  });
});

export type DerivativeIndexPatternColumn = FormattedIndexPatternColumn &
  ReferenceBasedIndexPatternColumn & {
    operationType: typeof DIFFERENCES_ID;
  };

export const derivativeOperation: OperationDefinition<
  DerivativeIndexPatternColumn,
  'fullReference'
> = {
  type: DIFFERENCES_ID,
  priority: 1,
  displayName: DIFFERENCES_NAME,
  input: 'fullReference',
  selectionStyle: 'full',
  requiredReferences: [
    {
      input: ['field', 'managedReference'],
      validateMetadata: (meta) => meta.dataType === 'number' && !meta.isBucketed,
    },
  ],
  getPossibleOperation: (indexPattern) => {
    if (hasDateField(indexPattern)) {
      return {
        dataType: 'number',
        isBucketed: false,
        scale: 'ratio',
      };
    }
  },
  getDefaultLabel: (column, columns, indexPattern) => {
    return ofName(columns[column.references[0]]?.label, column.timeScale, column.timeShift);
  },
  toExpression: (layer, columnId) => {
    return dateBasedOperationToExpression(layer, columnId, 'derivative');
  },
  buildColumn: ({ referenceIds, previousColumn, layer }, columnParams) => {
    const ref = layer.columns[referenceIds[0]];
    const differencesColumnParams = columnParams as DerivativeIndexPatternColumn;
    const timeScale = differencesColumnParams?.timeScale ?? previousColumn?.timeScale;
    return {
      label: ofName(ref?.label, previousColumn?.timeScale, previousColumn?.timeShift),
      dataType: 'number',
      operationType: DIFFERENCES_ID,
      isBucketed: false,
      scale: 'ratio',
      references: referenceIds,
      timeScale,
      filter: getFilter(previousColumn, columnParams),
      timeShift: columnParams?.shift || previousColumn?.timeShift,
      params: getFormatFromPreviousColumn(previousColumn),
    };
  },
  isTransferable: (column, newIndexPattern) => {
    return hasDateField(newIndexPattern);
  },
  getErrorMessage: (layer: FormBasedLayer, columnId: string) => {
    return getErrorsForDateReference(
      layer,
      columnId,
      i18n.translate('xpack.lens.indexPattern.derivative', {
        defaultMessage: 'Differences',
      })
    );
  },
  getDisabledStatus(indexPattern, layer, layerType) {
    const opName = i18n.translate('xpack.lens.indexPattern.derivative', {
      defaultMessage: 'Differences',
    });
    if (layerType) {
      const dataLayerErrors = checkForDataLayerType(layerType, opName);
      if (dataLayerErrors) {
        return dataLayerErrors.join(', ');
      }
    }
    return checkForDateHistogram(layer, opName)
      .map((e) => e.message)
      .join(', ');
  },
  timeScalingMode: 'optional',
  filterable: true,
  quickFunctionDocumentation: i18n.translate(
    'xpack.lens.indexPattern.differences.documentation.quick',
    {
      defaultMessage: `
      The change between the values in subsequent intervals.
      `,
    }
  ),
  shiftable: true,
};
