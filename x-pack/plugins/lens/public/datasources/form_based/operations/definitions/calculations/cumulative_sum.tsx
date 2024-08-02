/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { CUMULATIVE_SUM_ID, CUMULATIVE_SUM_NAME } from '@kbn/lens-formula-docs';
import { FormattedIndexPatternColumn, ReferenceBasedIndexPatternColumn } from '../column_types';
import { FormBasedLayer } from '../../../types';
import {
  checkForDateHistogram,
  getErrorsForDateReference,
  dateBasedOperationToExpression,
  hasDateField,
  buildLabelFunction,
  checkForDataLayerType,
} from './utils';
import { OperationDefinition } from '..';
import { getFormatFromPreviousColumn, getFilter } from '../helpers';
import { DOCUMENT_FIELD_NAME } from '../../../../../../common/constants';

const ofName = buildLabelFunction((name?: string) => {
  return i18n.translate('xpack.lens.indexPattern.cumulativeSumOf', {
    defaultMessage: 'Cumulative sum of {name}',
    values: {
      name:
        name ??
        i18n.translate('xpack.lens.indexPattern.incompleteOperation', {
          defaultMessage: '(incomplete)',
        }),
    },
  });
});

export type CumulativeSumIndexPatternColumn = FormattedIndexPatternColumn &
  ReferenceBasedIndexPatternColumn & {
    operationType: typeof CUMULATIVE_SUM_ID;
  };

export const cumulativeSumOperation: OperationDefinition<
  CumulativeSumIndexPatternColumn,
  'fullReference'
> = {
  type: CUMULATIVE_SUM_ID,
  priority: 1,
  displayName: CUMULATIVE_SUM_NAME,
  input: 'fullReference',
  selectionStyle: 'field',
  requiredReferences: [
    {
      input: ['field', 'managedReference'],
      specificOperations: ['count', 'sum'],
      validateMetadata: (meta, operationType, fieldName) =>
        meta.dataType === 'number' &&
        !meta.isBucketed &&
        // exclude value counts
        !(operationType === 'count' && fieldName !== DOCUMENT_FIELD_NAME),
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
    const ref = columns[column.references[0]];
    return ofName(
      ref && 'sourceField' in ref
        ? indexPattern?.getFieldByName(ref.sourceField)?.displayName
        : undefined,
      undefined,
      column.timeShift
    );
  },
  toExpression: (layer, columnId) => {
    return dateBasedOperationToExpression(layer, columnId, 'cumulative_sum');
  },
  buildColumn: ({ referenceIds, previousColumn, layer, indexPattern }, columnParams) => {
    const ref = layer.columns[referenceIds[0]];
    return {
      label: ofName(
        ref && 'sourceField' in ref
          ? indexPattern.getFieldByName(ref.sourceField)?.displayName
          : undefined,
        undefined,
        previousColumn?.timeShift
      ),
      dataType: 'number',
      operationType: 'cumulative_sum',
      isBucketed: false,
      scale: 'ratio',
      timeShift: columnParams?.shift || previousColumn?.timeShift,
      filter: getFilter(previousColumn, columnParams),
      references: referenceIds,
      params: getFormatFromPreviousColumn(previousColumn),
    };
  },
  isTransferable: () => {
    return true;
  },
  getErrorMessage: (layer: FormBasedLayer, columnId: string) => {
    return getErrorsForDateReference(
      layer,
      columnId,
      i18n.translate('xpack.lens.indexPattern.cumulativeSum', {
        defaultMessage: 'Cumulative sum',
      })
    );
  },
  getDisabledStatus(indexPattern, layer, layerType) {
    const opName = i18n.translate('xpack.lens.indexPattern.cumulativeSum', {
      defaultMessage: 'Cumulative sum',
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
  filterable: true,
  quickFunctionDocumentation: i18n.translate(
    'xpack.lens.indexPattern.cumulativeSum.documentation.quick',
    {
      defaultMessage: `
      The sum of all values as they grow over time.
      `,
    }
  ),
  shiftable: true,
};
