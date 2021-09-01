/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFormRow,
  EuiSelect,
  EuiSwitch,
  EuiSwitchEvent,
  EuiSpacer,
  EuiAccordion,
  EuiIconTip,
} from '@elastic/eui';
import { uniq } from 'lodash';
import { CoreStart } from 'kibana/public';
import { FieldStatsResponse } from '../../../../../common';
import { AggFunctionsMapping, esQuery } from '../../../../../../../../src/plugins/data/public';
import { buildExpressionFunction } from '../../../../../../../../src/plugins/expressions/public';
import { updateColumnParam, isReferenced } from '../../layer_helpers';
import { DataType, FrameDatasourceAPI } from '../../../../types';
import { FiltersIndexPatternColumn, OperationDefinition, operationDefinitionMap } from '../index';
import { FieldBasedIndexPatternColumn } from '../column_types';
import { ValuesInput } from './values_input';
import { getInvalidFieldMessage } from '../helpers';
import type { IndexPatternLayer, IndexPattern } from '../../../types';
import { defaultLabel } from '../filters';

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

function getDisallowedTermsMessage(
  layer: IndexPatternLayer,
  columnId: string,
  indexPattern: IndexPattern
) {
  const hasMultipleShifts =
    uniq(
      Object.values(layer.columns)
        .filter((col) => operationDefinitionMap[col.operationType].shiftable)
        .map((col) => col.timeShift || '')
    ).length > 1;
  if (!hasMultipleShifts) {
    return undefined;
  }
  return {
    message: i18n.translate('xpack.lens.indexPattern.termsWithMultipleShifts', {
      defaultMessage:
        'In a single layer, you are unable to combine metrics with different time shifts and dynamic top values. Use the same time shift value for all metrics, or use filters instead of top values.',
    }),
    fixAction: {
      label: i18n.translate('xpack.lens.indexPattern.termsWithMultipleShiftsFixActionLabel', {
        defaultMessage: 'Use filters',
      }),
      newState: async (core: CoreStart, frame: FrameDatasourceAPI, layerId: string) => {
        const currentColumn = layer.columns[columnId] as TermsIndexPatternColumn;
        const fieldName = currentColumn.sourceField;
        const activeDataFieldNameMatch =
          frame.activeData?.[layerId].columns.find(({ id }) => id === columnId)?.meta.field ===
          fieldName;
        let currentTerms = uniq(
          frame.activeData?.[layerId].rows
            .map((row) => row[columnId] as string)
            .filter((term) => typeof term === 'string' && term !== '__other__') || []
        );
        if (!activeDataFieldNameMatch || currentTerms.length === 0) {
          const response: FieldStatsResponse<string | number> = await core.http.post(
            `/api/lens/index_stats/${indexPattern.id}/field`,
            {
              body: JSON.stringify({
                fieldName,
                dslQuery: esQuery.buildEsQuery(
                  indexPattern,
                  frame.query,
                  frame.filters,
                  esQuery.getEsQueryConfig(core.uiSettings)
                ),
                fromDate: frame.dateRange.fromDate,
                toDate: frame.dateRange.toDate,
                size: currentColumn.params.size,
              }),
            }
          );
          currentTerms = response.topValues?.buckets.map(({ key }) => String(key)) || [];
        }
        return {
          ...layer,
          columns: {
            ...layer.columns,
            [columnId]: {
              label: i18n.translate('xpack.lens.indexPattern.pinnedTopValuesLabel', {
                defaultMessage: 'Filters of {field}',
                values: {
                  field: fieldName,
                },
              }),
              customLabel: true,
              isBucketed: layer.columns[columnId].isBucketed,
              dataType: 'string',
              operationType: 'filters',
              params: {
                filters:
                  currentTerms.length > 0
                    ? currentTerms.map((term) => ({
                        input: {
                          query: `${fieldName}: "${term}"`,
                          language: 'kuery',
                        },
                        label: term,
                      }))
                    : [
                        {
                          input: {
                            query: '*',
                            language: 'kuery',
                          },
                          label: defaultLabel,
                        },
                      ],
              },
            } as FiltersIndexPatternColumn,
          },
        };
      },
    },
  };
}

const DEFAULT_SIZE = 3;
const supportedTypes = new Set(['string', 'boolean', 'number', 'ip']);

export interface TermsIndexPatternColumn extends FieldBasedIndexPatternColumn {
  operationType: 'terms';
  params: {
    size: number;
    // if order is alphabetical, the `fallback` flag indicates whether it became alphabetical because there wasn't
    // another option or whether the user explicitly chose to make it alphabetical.
    orderBy: { type: 'alphabetical'; fallback?: boolean } | { type: 'column'; columnId: string };
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
  getErrorMessage: (layer, columnId, indexPattern) => {
    const messages = [
      ...(getInvalidFieldMessage(
        layer.columns[columnId] as FieldBasedIndexPatternColumn,
        indexPattern
      ) || []),
      getDisallowedTermsMessage(layer, columnId, indexPattern) || '',
    ].filter(Boolean);
    return messages.length ? messages : undefined;
  },
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
          : { type: 'alphabetical', fallback: true },
        orderDirection: existingMetricColumn ? 'desc' : 'asc',
        otherBucket: !indexPattern.hasRestrictions,
        missingBucket: false,
      },
    };
  },
  toEsAggsFn: (column, columnId, _indexPattern, layer, uiSettings, orderedColumnIds) => {
    return buildExpressionFunction<AggFunctionsMapping['aggTerms']>('aggTerms', {
      id: columnId,
      enabled: true,
      schema: 'segment',
      field: column.sourceField,
      orderBy:
        column.params.orderBy.type === 'alphabetical'
          ? '_key'
          : String(orderedColumnIds.indexOf(column.params.orderBy.columnId)),
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
    if (currentColumn.params.orderBy.type === 'column' || currentColumn.params.orderBy.fallback) {
      // check whether the column is still there and still a metric
      const columnSortedBy =
        currentColumn.params.orderBy.type === 'column'
          ? columns[currentColumn.params.orderBy.columnId]
          : undefined;
      if (
        !columnSortedBy ||
        (currentColumn.params.orderBy.type === 'column' &&
          !isSortableByColumn(layer, currentColumn.params.orderBy.columnId))
      ) {
        // check whether we can find another metric column to sort by
        const existingMetricColumn = Object.entries(layer.columns)
          .filter(([columnId]) => isSortableByColumn(layer, columnId))
          .map(([id]) => id)[0];
        return {
          ...currentColumn,
          params: {
            ...currentColumn.params,
            orderBy: existingMetricColumn
              ? { type: 'column', columnId: existingMetricColumn }
              : { type: 'alphabetical', fallback: true },
            orderDirection: existingMetricColumn ? 'desc' : 'asc',
          },
        };
      }
    }
    return currentColumn;
  },
  paramEditor: function ParamEditor({ layer, updateLayer, currentColumn, columnId, indexPattern }) {
    const hasRestrictions = indexPattern.hasRestrictions;

    const SEPARATOR = '$$$';
    function toValue(orderBy: TermsIndexPatternColumn['params']['orderBy']) {
      if (orderBy.type === 'alphabetical') {
        return orderBy.type;
      }
      return `${orderBy.type}${SEPARATOR}${orderBy.columnId}`;
    }

    function fromValue(value: string): TermsIndexPatternColumn['params']['orderBy'] {
      if (value === 'alphabetical') {
        return { type: 'alphabetical', fallback: false };
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
        <ValuesInput
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
        <EuiFormRow
          label={
            <>
              {i18n.translate('xpack.lens.indexPattern.terms.orderBy', {
                defaultMessage: 'Rank by',
              })}{' '}
              <EuiIconTip
                color="subdued"
                content={i18n.translate('xpack.lens.indexPattern.terms.orderByHelp', {
                  defaultMessage: `Specifies the dimension the top values are ranked by.`,
                })}
                iconProps={{
                  className: 'eui-alignTop',
                }}
                position="top"
                size="s"
                type="questionInCircle"
              />
            </>
          }
          display="columnCompressed"
          fullWidth
        >
          <EuiSelect
            compressed
            data-test-subj="indexPattern-terms-orderBy"
            options={orderOptions}
            value={toValue(currentColumn.params.orderBy)}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              const newOrderByValue = fromValue(e.target.value);
              const updatedLayer = updateColumnParam({
                layer,
                columnId,
                paramName: 'orderBy',
                value: newOrderByValue,
              });
              updateLayer(
                updateColumnParam({
                  layer: updatedLayer,
                  columnId,
                  paramName: 'orderDirection',
                  value: newOrderByValue.type === 'alphabetical' ? 'asc' : 'desc',
                })
              );
            }}
            aria-label={i18n.translate('xpack.lens.indexPattern.terms.orderBy', {
              defaultMessage: 'Rank by',
            })}
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.lens.indexPattern.terms.orderDirection', {
            defaultMessage: 'Rank direction',
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
              defaultMessage: 'Rank by',
            })}
          />
        </EuiFormRow>
        {!hasRestrictions && (
          <>
            <EuiSpacer size="s" />
            <EuiAccordion
              id="lnsTermsAdvanced"
              buttonContent={i18n.translate('xpack.lens.indexPattern.terms.advancedSettings', {
                defaultMessage: 'Advanced',
              })}
            >
              <EuiSpacer size="m" />
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
                disabled={
                  !currentColumn.params.otherBucket ||
                  indexPattern.getFieldByName(currentColumn.sourceField)?.type !== 'string'
                }
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
            </EuiAccordion>
          </>
        )}
      </>
    );
  },
};
