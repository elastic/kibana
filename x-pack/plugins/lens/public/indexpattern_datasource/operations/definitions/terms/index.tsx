/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFormRow,
  EuiSelect,
  EuiSwitch,
  EuiSwitchEvent,
  EuiSpacer,
  EuiPopover,
  EuiButtonEmpty,
  EuiText,
} from '@elastic/eui';
import { AggFunctionsMapping } from '../../../../../../../../src/plugins/data/public';
import { buildExpressionFunction } from '../../../../../../../../src/plugins/expressions/public';
import { updateColumnParam, isReferenced } from '../../layer_helpers';
import { DataType } from '../../../../types';
import { OperationDefinition } from '../index';
import { FieldBasedIndexPatternColumn } from '../column_types';
import { ValuesRangeInput } from './values_range_input';
import { getEsAggsSuffix, getInvalidFieldMessage } from '../helpers';
import type { IndexPatternLayer } from '../../../types';

function ofName(name?: string) {
  return i18n.translate('xpack.lens.indexPattern.termsOf', {
    defaultMessage: 'Top values of {name}',
    values: {
      name:
        name ??
        i18n.translate('xpack.lens.indexPattern.missingFieldLabel', {
          defaultMessage: 'Missing field',
        }),
    },
  });
}

function isSortableByColumn(layer: IndexPatternLayer, columnId: string) {
  const column = layer.columns[columnId];
  return (
    column &&
    !column.isBucketed &&
    column.operationType !== 'last_value' &&
    !('references' in column) &&
    !isReferenced(layer, columnId)
  );
}

const DEFAULT_SIZE = 3;
const supportedTypes = new Set(['string', 'boolean', 'number', 'ip']);

export interface TermsIndexPatternColumn extends FieldBasedIndexPatternColumn {
  operationType: 'terms';
  params: {
    size: number;
    orderBy: { type: 'alphabetical' } | { type: 'column'; columnId: string };
    orderDirection: 'asc' | 'desc';
    otherBucket?: boolean;
    missingBucket?: boolean;
    // Terms on numeric fields can be formatted
    format?: {
      id: string;
      params?: {
        decimals: number;
      };
    };
  };
}

export const termsOperation: OperationDefinition<TermsIndexPatternColumn, 'field'> = {
  type: 'terms',
  displayName: i18n.translate('xpack.lens.indexPattern.terms', {
    defaultMessage: 'Top values',
  }),
  priority: 3, // Higher than any metric
  input: 'field',
  getPossibleOperationForField: ({ aggregationRestrictions, aggregatable, type }) => {
    if (
      supportedTypes.has(type) &&
      aggregatable &&
      (!aggregationRestrictions || aggregationRestrictions.terms)
    ) {
      return { dataType: type as DataType, isBucketed: true, scale: 'ordinal' };
    }
  },
  getErrorMessage: (layer, columnId, indexPattern) =>
    getInvalidFieldMessage(layer.columns[columnId] as FieldBasedIndexPatternColumn, indexPattern),
  isTransferable: (column, newIndexPattern) => {
    const newField = newIndexPattern.getFieldByName(column.sourceField);

    return Boolean(
      newField &&
        supportedTypes.has(newField.type) &&
        newField.aggregatable &&
        (!newField.aggregationRestrictions || newField.aggregationRestrictions.terms) &&
        (!column.params.otherBucket || !newIndexPattern.hasRestrictions)
    );
  },
  buildColumn({ layer, field, indexPattern }) {
    const existingMetricColumn = Object.entries(layer.columns)
      .filter(([columnId]) => isSortableByColumn(layer, columnId))
      .map(([id]) => id)[0];

    const previousBucketsLength = Object.values(layer.columns).filter(
      (col) => col && col.isBucketed
    ).length;

    return {
      label: ofName(field.displayName),
      dataType: field.type as DataType,
      operationType: 'terms',
      scale: 'ordinal',
      sourceField: field.name,
      isBucketed: true,
      params: {
        size: previousBucketsLength === 0 ? 5 : DEFAULT_SIZE,
        orderBy: existingMetricColumn
          ? {
              type: 'column',
              columnId: existingMetricColumn,
            }
          : { type: 'alphabetical' },
        orderDirection: existingMetricColumn ? 'desc' : 'asc',
        otherBucket: !indexPattern.hasRestrictions,
        missingBucket: false,
      },
    };
  },
  toEsAggsFn: (column, columnId, _indexPattern, layer) => {
    return buildExpressionFunction<AggFunctionsMapping['aggTerms']>('aggTerms', {
      id: columnId,
      enabled: true,
      schema: 'segment',
      field: column.sourceField,
      orderBy:
        column.params.orderBy.type === 'alphabetical'
          ? '_key'
          : `${column.params.orderBy.columnId}${getEsAggsSuffix(
              layer.columns[column.params.orderBy.columnId]
            )}`,
      order: column.params.orderDirection,
      size: column.params.size,
      otherBucket: Boolean(column.params.otherBucket),
      otherBucketLabel: i18n.translate('xpack.lens.indexPattern.terms.otherLabel', {
        defaultMessage: 'Other',
      }),
      missingBucket: column.params.otherBucket && column.params.missingBucket,
      missingBucketLabel: i18n.translate('xpack.lens.indexPattern.terms.missingLabel', {
        defaultMessage: '(missing value)',
      }),
    }).toAst();
  },
  getDefaultLabel: (column, indexPattern) =>
    ofName(indexPattern.getFieldByName(column.sourceField)?.displayName),
  onFieldChange: (oldColumn, field) => {
    const newParams = { ...oldColumn.params };
    if ('format' in newParams && field.type !== 'number') {
      delete newParams.format;
    }
    return {
      ...oldColumn,
      dataType: field.type as DataType,
      label: ofName(field.displayName),
      sourceField: field.name,
      params: newParams,
    };
  },
  onOtherColumnChanged: (layer, thisColumnId, changedColumnId) => {
    const columns = layer.columns;
    const currentColumn = columns[thisColumnId] as TermsIndexPatternColumn;
    if (currentColumn.params.orderBy.type === 'column') {
      // check whether the column is still there and still a metric
      const columnSortedBy = columns[currentColumn.params.orderBy.columnId];
      if (!columnSortedBy || !isSortableByColumn(layer, changedColumnId)) {
        return {
          ...currentColumn,
          params: {
            ...currentColumn.params,
            orderBy: { type: 'alphabetical' },
            orderDirection: 'asc',
          },
        };
      }
    }
    return currentColumn;
  },
  paramEditor: function ParamEditor({ layer, updateLayer, currentColumn, columnId, indexPattern }) {
    const hasRestrictions = indexPattern.hasRestrictions;

    const [popoverOpen, setPopoverOpen] = useState(false);

    const SEPARATOR = '$$$';
    function toValue(orderBy: TermsIndexPatternColumn['params']['orderBy']) {
      if (orderBy.type === 'alphabetical') {
        return orderBy.type;
      }
      return `${orderBy.type}${SEPARATOR}${orderBy.columnId}`;
    }

    function fromValue(value: string): TermsIndexPatternColumn['params']['orderBy'] {
      if (value === 'alphabetical') {
        return { type: 'alphabetical' };
      }
      const parts = value.split(SEPARATOR);
      return {
        type: 'column',
        columnId: parts[1],
      };
    }

    const orderOptions = Object.entries(layer.columns)
      .filter(([sortId]) => isSortableByColumn(layer, sortId))
      .map(([sortId, column]) => {
        return {
          value: toValue({ type: 'column', columnId: sortId }),
          text: column.label,
        };
      });
    orderOptions.push({
      value: toValue({ type: 'alphabetical' }),
      text: i18n.translate('xpack.lens.indexPattern.terms.orderAlphabetical', {
        defaultMessage: 'Alphabetical',
      }),
    });
    return (
      <>
        <EuiFormRow
          label={i18n.translate('xpack.lens.indexPattern.terms.size', {
            defaultMessage: 'Number of values',
          })}
          display="columnCompressed"
          fullWidth
        >
          <ValuesRangeInput
            value={currentColumn.params.size}
            onChange={(value) => {
              updateLayer(
                updateColumnParam({
                  layer,
                  columnId,
                  paramName: 'size',
                  value,
                })
              );
            }}
          />
        </EuiFormRow>
        {!hasRestrictions && (
          <EuiText textAlign="right">
            <EuiPopover
              ownFocus
              button={
                <EuiButtonEmpty
                  size="xs"
                  iconType="arrowDown"
                  iconSide="right"
                  onClick={() => {
                    setPopoverOpen(!popoverOpen);
                  }}
                >
                  {i18n.translate('xpack.lens.indexPattern.terms.advancedSettings', {
                    defaultMessage: 'Advanced',
                  })}
                </EuiButtonEmpty>
              }
              isOpen={popoverOpen}
              closePopover={() => {
                setPopoverOpen(false);
              }}
            >
              <EuiSwitch
                label={i18n.translate('xpack.lens.indexPattern.terms.otherBucketDescription', {
                  defaultMessage: 'Group other values as "Other"',
                })}
                compressed
                data-test-subj="indexPattern-terms-other-bucket"
                checked={Boolean(currentColumn.params.otherBucket)}
                onChange={(e: EuiSwitchEvent) =>
                  updateLayer(
                    updateColumnParam({
                      layer,
                      columnId,
                      paramName: 'otherBucket',
                      value: e.target.checked,
                    })
                  )
                }
              />
              <EuiSpacer size="m" />
              <EuiSwitch
                label={i18n.translate('xpack.lens.indexPattern.terms.missingBucketDescription', {
                  defaultMessage: 'Include documents without this field',
                })}
                compressed
                disabled={!currentColumn.params.otherBucket}
                data-test-subj="indexPattern-terms-missing-bucket"
                checked={Boolean(currentColumn.params.missingBucket)}
                onChange={(e: EuiSwitchEvent) =>
                  updateLayer(
                    updateColumnParam({
                      layer,
                      columnId,
                      paramName: 'missingBucket',
                      value: e.target.checked,
                    })
                  )
                }
              />
            </EuiPopover>
            <EuiSpacer size="s" />
          </EuiText>
        )}
        <EuiFormRow
          label={i18n.translate('xpack.lens.indexPattern.terms.orderBy', {
            defaultMessage: 'Order by',
          })}
          display="columnCompressed"
          fullWidth
        >
          <EuiSelect
            compressed
            data-test-subj="indexPattern-terms-orderBy"
            options={orderOptions}
            value={toValue(currentColumn.params.orderBy)}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              updateLayer(
                updateColumnParam({
                  layer,
                  columnId,
                  paramName: 'orderBy',
                  value: fromValue(e.target.value),
                })
              )
            }
            aria-label={i18n.translate('xpack.lens.indexPattern.terms.orderBy', {
              defaultMessage: 'Order by',
            })}
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.lens.indexPattern.terms.orderDirection', {
            defaultMessage: 'Order direction',
          })}
          display="columnCompressed"
          fullWidth
        >
          <EuiSelect
            compressed
            data-test-subj="indexPattern-terms-orderDirection"
            options={[
              {
                value: 'asc',
                text: i18n.translate('xpack.lens.indexPattern.terms.orderAscending', {
                  defaultMessage: 'Ascending',
                }),
              },
              {
                value: 'desc',
                text: i18n.translate('xpack.lens.indexPattern.terms.orderDescending', {
                  defaultMessage: 'Descending',
                }),
              },
            ]}
            value={currentColumn.params.orderDirection}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              updateLayer(
                updateColumnParam({
                  layer,
                  columnId,
                  paramName: 'orderDirection',
                  value: e.target.value as 'asc' | 'desc',
                })
              )
            }
            aria-label={i18n.translate('xpack.lens.indexPattern.terms.orderBy', {
              defaultMessage: 'Order by',
            })}
          />
        </EuiFormRow>
      </>
    );
  },
};
