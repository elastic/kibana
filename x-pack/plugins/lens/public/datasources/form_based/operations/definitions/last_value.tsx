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
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiSwitch,
  EuiToolTip,
  EuiText,
} from '@elastic/eui';
import { AggFunctionsMapping } from '@kbn/data-plugin/public';
import { buildExpressionFunction } from '@kbn/expressions-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { LAST_VALUE_ID, LAST_VALUE_NAME } from '@kbn/lens-formula-docs';
import type { FieldBasedOperationErrorMessage, OperationDefinition } from '.';
import { FieldBasedIndexPatternColumn, ValueFormatConfig } from './column_types';
import type { IndexPatternField, IndexPattern } from '../../../../types';
import { DataType } from '../../../../types';
import {
  getFormatFromPreviousColumn,
  getInvalidFieldMessage,
  getSafeName,
  getFilter,
  getExistsFilter,
  comparePreviousColumnFilter,
} from './helpers';
import { adjustTimeScaleLabelSuffix } from '../time_scale_utils';
import { isRuntimeField, isScriptedField } from './terms/helpers';
import { FormRow } from './shared_components/form_row';
import { getColumnReducedTimeRangeError } from '../../reduced_time_range_utils';
import { getGroupByKey } from './get_group_by_key';
import {
  LAST_VALUE_OP_SORT_FIELD_INVALID_TYPE,
  LAST_VALUE_OP_SORT_FIELD_NOT_FOUND,
} from '../../../../user_messages_ids';

function ofName(name: string, timeShift: string | undefined, reducedTimeRange: string | undefined) {
  return adjustTimeScaleLabelSuffix(
    i18n.translate('xpack.lens.indexPattern.lastValueOf', {
      defaultMessage: 'Last value of {name}',
      values: {
        name,
      },
    }),
    undefined,
    undefined,
    undefined,
    timeShift,
    undefined,
    reducedTimeRange
  );
}

const supportedTypes = new Set([
  'string',
  'boolean',
  'number',
  'ip',
  'date',
  'ip_range',
  'number_range',
  'date_range',
]);

function getInvalidSortFieldMessages(
  sortField: string,
  columnId: string,
  indexPattern?: IndexPattern
): FieldBasedOperationErrorMessage[] {
  if (!indexPattern) {
    return [];
  }
  const field = indexPattern.getFieldByName(sortField);
  if (!field) {
    return [
      {
        uniqueId: LAST_VALUE_OP_SORT_FIELD_NOT_FOUND,
        message: (
          <FormattedMessage
            id="xpack.lens.indexPattern.lastValue.sortFieldNotFound"
            defaultMessage="Sort field {sortField} was not found."
            values={{
              sortField: <strong>{sortField}</strong>,
            }}
          />
        ),
        displayLocations: [
          { id: 'toolbar' },
          { id: 'dimensionButton', dimensionId: columnId },
          { id: 'embeddableBadge' },
        ],
      },
    ];
  }
  if (field.type !== 'date') {
    return [
      {
        uniqueId: LAST_VALUE_OP_SORT_FIELD_INVALID_TYPE,
        message: i18n.translate('xpack.lens.indexPattern.lastValue.invalidTypeSortField', {
          defaultMessage: 'Field {invalidField} is not a date field and cannot be used for sorting',
          values: { invalidField: sortField },
        }),
      },
    ];
  }
  return [];
}

function isTimeFieldNameDateField(indexPattern: IndexPattern) {
  return (
    indexPattern.timeFieldName &&
    indexPattern.fields.find(
      (field) => field.name === indexPattern.timeFieldName && field.type === 'date'
    )
  );
}

function getDateFields(indexPattern: IndexPattern): IndexPatternField[] {
  const dateFields = indexPattern.fields.filter((field) => field.type === 'date');
  if (isTimeFieldNameDateField(indexPattern)) {
    dateFields.sort(({ name: nameA }, { name: nameB }) => {
      if (nameA === indexPattern.timeFieldName) {
        return -1;
      }
      if (nameB === indexPattern.timeFieldName) {
        return 1;
      }
      return 0;
    });
  }
  return dateFields;
}

function setDefaultShowArrayValues(
  field: IndexPatternField,
  oldParams: LastValueIndexPatternColumn['params']
) {
  return (
    isScriptedField(field) ||
    (isRuntimeField(field) && field.type !== 'number') ||
    oldParams?.showArrayValues
  );
}

export interface LastValueIndexPatternColumn extends FieldBasedIndexPatternColumn {
  operationType: typeof LAST_VALUE_ID;
  params: {
    sortField: string;
    showArrayValues: boolean;
    // last value on numeric fields can be formatted
    format?: ValueFormatConfig;
  };
}

function getScale(type: string) {
  return type === 'string' ||
    type === 'ip' ||
    type === 'ip_range' ||
    type === 'date_range' ||
    type === 'number_range'
    ? 'ordinal'
    : 'ratio';
}

export const lastValueOperation: OperationDefinition<
  LastValueIndexPatternColumn,
  'field',
  Partial<LastValueIndexPatternColumn['params']>,
  true
> = {
  type: LAST_VALUE_ID,
  displayName: LAST_VALUE_NAME,
  getDefaultLabel: (column, columns, indexPattern) =>
    ofName(
      getSafeName(column.sourceField, indexPattern),
      column.timeShift,
      column.reducedTimeRange
    ),
  input: 'field',
  onFieldChange: (oldColumn, field) => {
    const newParams = { ...oldColumn.params };

    newParams.showArrayValues = setDefaultShowArrayValues(field, oldColumn.params);

    if ('format' in newParams && field.type !== 'number') {
      delete newParams.format;
    }
    return {
      ...oldColumn,
      dataType: field.type as DataType,
      label: ofName(field.displayName, oldColumn.timeShift, oldColumn.reducedTimeRange),
      sourceField: field.name,
      params: newParams,
      scale: getScale(field.type),
      filter:
        oldColumn.filter && comparePreviousColumnFilter(oldColumn.filter, oldColumn.sourceField)
          ? getExistsFilter(field.name)
          : oldColumn.filter,
    };
  },
  getPossibleOperationForField: ({ aggregationRestrictions, type }) => {
    if (supportedTypes.has(type) && !aggregationRestrictions) {
      return {
        dataType: type as DataType,
        isBucketed: false,
        scale: getScale(type),
      };
    }
  },
  getDisabledStatus(indexPattern: IndexPattern) {
    const hasDateFields = indexPattern && getDateFields(indexPattern).length;
    if (!hasDateFields) {
      return i18n.translate('xpack.lens.indexPattern.lastValue.disabled', {
        defaultMessage: 'This function requires the presence of a date field in your data view',
      });
    }
  },
  getErrorMessage(layer, columnId, indexPattern) {
    const column = layer.columns[columnId] as LastValueIndexPatternColumn;
    return [
      ...getInvalidFieldMessage(layer, columnId, indexPattern),
      ...getInvalidSortFieldMessages(column.params.sortField, columnId, indexPattern),
      ...getColumnReducedTimeRangeError(layer, columnId, indexPattern),
    ];
  },
  buildColumn({ field, previousColumn, indexPattern }, columnParams) {
    const lastValueParams = columnParams as LastValueIndexPatternColumn['params'];
    const sortField = isTimeFieldNameDateField(indexPattern)
      ? indexPattern.timeFieldName
      : indexPattern.fields.find((f) => f.type === 'date')?.name;

    if (!sortField) {
      throw new Error(
        i18n.translate('xpack.lens.functions.lastValue.missingSortField', {
          defaultMessage: 'This data view does not contain any date fields',
        })
      );
    }

    const showArrayValues = setDefaultShowArrayValues(field, lastValueParams);

    return {
      label: ofName(field.displayName, previousColumn?.timeShift, previousColumn?.reducedTimeRange),
      dataType: field.type as DataType,
      operationType: LAST_VALUE_ID,
      isBucketed: false,
      scale: getScale(field.type),
      sourceField: field.name,
      filter: getFilter(previousColumn, columnParams) || getExistsFilter(field.name),
      timeShift: columnParams?.shift || previousColumn?.timeShift,
      reducedTimeRange: columnParams?.reducedTimeRange || previousColumn?.reducedTimeRange,
      params: {
        showArrayValues,
        sortField: lastValueParams?.sortField || sortField,
        ...getFormatFromPreviousColumn(previousColumn),
      },
    };
  },
  filterable: true,
  canReduceTimeRange: true,
  shiftable: true,
  toEsAggsFn: (column, columnId, indexPattern) => {
    const initialArgs = {
      id: columnId,
      enabled: true,
      schema: 'metric',
      field: column.sourceField,
      size: 1,
      sortOrder: 'desc',
      sortField: column.params.sortField,
      // time shift is added to wrapping aggFilteredMetric if filter is set
      timeShift: column.filter ? undefined : column.timeShift,
    } as const;
    // do not use unsupported top hits when using a counter field type
    const isCounterMetricFieldUsed =
      indexPattern.getFieldByName(column.sourceField)?.timeSeriesMetric === 'counter';

    return (
      column.params.showArrayValues && !isCounterMetricFieldUsed
        ? buildExpressionFunction<AggFunctionsMapping['aggTopHit']>('aggTopHit', {
            ...initialArgs,
            aggregate: 'concat',
          })
        : buildExpressionFunction<AggFunctionsMapping['aggTopMetrics']>(
            'aggTopMetrics',
            initialArgs
          )
    ).toAst();
  },

  getGroupByKey: (agg) => {
    return getGroupByKey(
      agg,
      ['aggTopHit', 'aggTopMetrics'],
      [{ name: 'field' }, { name: 'sortField' }]
    );
  },

  isTransferable: (column, newIndexPattern) => {
    const newField = newIndexPattern.getFieldByName(column.sourceField);
    const newTimeField = newIndexPattern.getFieldByName(column.params.sortField);
    return Boolean(
      newField &&
        newField.type === column.dataType &&
        !newField.aggregationRestrictions &&
        newTimeField?.type === 'date' &&
        supportedTypes.has(newField.type)
    );
  },
  allowAsReference: true,
  paramEditor: ({
    layer,
    paramEditorUpdater,
    currentColumn,
    indexPattern,
    isReferenced,
    paramEditorCustomProps,
  }) => {
    const { labels, isInline } = paramEditorCustomProps || {};
    const sortByFieldLabel =
      labels?.[0] ||
      i18n.translate('xpack.lens.indexPattern.lastValue.sortField', {
        defaultMessage: 'Sort by date field',
      });

    const dateFields = getDateFields(indexPattern);
    const isSortFieldInvalid =
      getInvalidSortFieldMessages(currentColumn.params.sortField, '', indexPattern).length > 0;

    const usingTopValues = Object.keys(layer.columns).some(
      (_columnId) => layer.columns[_columnId].operationType === 'terms'
    );

    const setShowArrayValues = (use: boolean) => {
      return paramEditorUpdater({
        ...currentColumn,
        params: {
          ...currentColumn.params,
          showArrayValues: use,
        },
      } as LastValueIndexPatternColumn);
    };

    return (
      <>
        {!isReferenced && (
          <EuiFormRow
            error={i18n.translate(
              'xpack.lens.indexPattern.lastValue.showArrayValuesWithTopValuesWarning',
              {
                defaultMessage:
                  'When you show array values, you are unable to use this field to rank top values.',
              }
            )}
            isInvalid={currentColumn.params.showArrayValues && usingTopValues}
            display="rowCompressed"
            fullWidth
            data-test-subj="lns-indexPattern-lastValue-showArrayValues"
          >
            <EuiToolTip
              content={i18n.translate(
                'xpack.lens.indexPattern.lastValue.showArrayValuesExplanation',
                {
                  defaultMessage:
                    'Displays all values associated with this field in each last document.',
                }
              )}
              position="left"
            >
              <EuiSwitch
                label={
                  <EuiText size="xs">
                    {i18n.translate('xpack.lens.indexPattern.lastValue.showArrayValues', {
                      defaultMessage: 'Show array values',
                    })}
                  </EuiText>
                }
                compressed={true}
                checked={Boolean(currentColumn.params.showArrayValues)}
                disabled={isScriptedField(currentColumn.sourceField, indexPattern)}
                onChange={() => setShowArrayValues(!currentColumn.params.showArrayValues)}
              />
            </EuiToolTip>
          </EuiFormRow>
        )}
        <FormRow
          isInline={isInline}
          label={sortByFieldLabel}
          display="rowCompressed"
          fullWidth
          error={i18n.translate('xpack.lens.indexPattern.sortField.invalid', {
            defaultMessage: 'Invalid field. Check your data view or pick another field.',
          })}
          isInvalid={isSortFieldInvalid}
        >
          <EuiComboBox
            placeholder={i18n.translate('xpack.lens.indexPattern.lastValue.sortFieldPlaceholder', {
              defaultMessage: 'Sort field',
            })}
            fullWidth
            compressed
            isClearable={false}
            data-test-subj="lns-indexPattern-lastValue-sortField"
            isInvalid={isSortFieldInvalid}
            singleSelection={{ asPlainText: true }}
            aria-label={sortByFieldLabel}
            options={dateFields?.map((field: IndexPatternField) => {
              return {
                value: field.name,
                label: field.displayName,
              };
            })}
            onChange={(choices) => {
              if (choices.length === 0) {
                return;
              }
              return paramEditorUpdater({
                ...currentColumn,
                params: {
                  ...currentColumn.params,
                  sortField: choices[0].value,
                },
              } as LastValueIndexPatternColumn);
            }}
            selectedOptions={
              (currentColumn.params?.sortField
                ? [
                    {
                      label:
                        indexPattern.getFieldByName(currentColumn.params.sortField)?.displayName ||
                        currentColumn.params.sortField,
                      value: currentColumn.params.sortField,
                    },
                  ]
                : []) as unknown as EuiComboBoxOptionOption[]
            }
          />
        </FormRow>
      </>
    );
  },
  quickFunctionDocumentation: i18n.translate(
    'xpack.lens.indexPattern.lastValue.documentation.quick',
    {
      defaultMessage: `
The value of a field from the last document, ordered by the default time field of the data view.
      `,
    }
  ),
};
