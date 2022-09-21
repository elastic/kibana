/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { EuiSwitch, EuiText } from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import {
  AggFunctionsMapping,
  ExpressionFunctionKql,
  ExpressionFunctionLucene,
} from '@kbn/data-plugin/public';
import {
  AnyExpressionFunctionDefinition,
  buildExpressionFunction,
  ExpressionAstExpressionBuilder,
  ExpressionAstFunctionBuilder,
} from '@kbn/expressions-plugin/public';
import { OperationDefinition, ParamEditorProps } from '.';
import { FieldBasedIndexPatternColumn, ValueFormatConfig } from './column_types';

import {
  getFormatFromPreviousColumn,
  getInvalidFieldMessage,
  getSafeName,
  getFilter,
  combineErrorMessages,
  isColumnOfType,
} from './helpers';
import { adjustTimeScaleLabelSuffix } from '../time_scale_utils';
import { getDisallowedPreviousShiftMessage } from '../../time_shift_utils';
import { updateColumnParam } from '../layer_helpers';
import { getColumnReducedTimeRangeError } from '../../reduced_time_range_utils';
import { groupByKey } from '../group_by_key';
import { extractAggId } from '../../to_expression';

const supportedTypes = new Set([
  'string',
  'boolean',
  'number',
  'number_range',
  'ip',
  'ip_range',
  'date',
  'date_range',
  'murmur3',
]);

const SCALE = 'ratio';
const OPERATION_TYPE = 'unique_count';
const IS_BUCKETED = false;

function ofName(name: string, timeShift: string | undefined, reducedTimeRange: string | undefined) {
  return adjustTimeScaleLabelSuffix(
    i18n.translate('xpack.lens.indexPattern.cardinalityOf', {
      defaultMessage: 'Unique count of {name}',
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

export interface CardinalityIndexPatternColumn extends FieldBasedIndexPatternColumn {
  operationType: typeof OPERATION_TYPE;
  params?: {
    emptyAsNull?: boolean;
    format?: ValueFormatConfig;
  };
}

export const cardinalityOperation: OperationDefinition<
  CardinalityIndexPatternColumn,
  'field',
  {},
  true
> = {
  type: OPERATION_TYPE,
  displayName: i18n.translate('xpack.lens.indexPattern.cardinality', {
    defaultMessage: 'Unique count',
  }),
  allowAsReference: true,
  input: 'field',
  getPossibleOperationForField: ({ aggregationRestrictions, aggregatable, type }) => {
    if (
      supportedTypes.has(type) &&
      aggregatable &&
      (!aggregationRestrictions || aggregationRestrictions.cardinality)
    ) {
      return { dataType: 'number', isBucketed: IS_BUCKETED, scale: SCALE };
    }
  },
  getErrorMessage: (layer, columnId, indexPattern) =>
    combineErrorMessages([
      getInvalidFieldMessage(layer.columns[columnId] as FieldBasedIndexPatternColumn, indexPattern),
      getDisallowedPreviousShiftMessage(layer, columnId),
      getColumnReducedTimeRangeError(layer, columnId, indexPattern),
    ]),
  isTransferable: (column, newIndexPattern) => {
    const newField = newIndexPattern.getFieldByName(column.sourceField);

    return Boolean(
      newField &&
        supportedTypes.has(newField.type) &&
        newField.aggregatable &&
        (!newField.aggregationRestrictions || newField.aggregationRestrictions.cardinality)
    );
  },
  filterable: true,
  shiftable: true,
  canReduceTimeRange: true,
  getDefaultLabel: (column, indexPattern) =>
    ofName(
      getSafeName(column.sourceField, indexPattern),
      column.timeShift,
      column.reducedTimeRange
    ),
  buildColumn({ field, previousColumn }, columnParams) {
    return {
      label: ofName(field.displayName, previousColumn?.timeShift, previousColumn?.reducedTimeRange),
      dataType: 'number',
      operationType: OPERATION_TYPE,
      scale: SCALE,
      sourceField: field.name,
      isBucketed: IS_BUCKETED,
      filter: getFilter(previousColumn, columnParams),
      timeShift: columnParams?.shift || previousColumn?.timeShift,
      reducedTimeRange: columnParams?.reducedTimeRange || previousColumn?.reducedTimeRange,
      params: {
        ...getFormatFromPreviousColumn(previousColumn),
        emptyAsNull:
          previousColumn &&
          isColumnOfType<CardinalityIndexPatternColumn>('unique_count', previousColumn)
            ? previousColumn.params?.emptyAsNull
            : !columnParams?.usedInMath,
      },
    };
  },
  getAdvancedOptions: ({
    layer,
    columnId,
    currentColumn,
    paramEditorUpdater,
  }: ParamEditorProps<CardinalityIndexPatternColumn>) => {
    return [
      {
        dataTestSubj: 'hide-zero-values',
        inlineElement: (
          <EuiSwitch
            label={
              <EuiText size="xs">
                {i18n.translate('xpack.lens.indexPattern.hideZero', {
                  defaultMessage: 'Hide zero values',
                })}
              </EuiText>
            }
            labelProps={{
              style: {
                fontWeight: euiThemeVars.euiFontWeightMedium,
              },
            }}
            checked={Boolean(currentColumn.params?.emptyAsNull)}
            onChange={() => {
              paramEditorUpdater(
                updateColumnParam({
                  layer,
                  columnId,
                  paramName: 'emptyAsNull',
                  value: !currentColumn.params?.emptyAsNull,
                })
              );
            }}
            compressed
          />
        ),
      },
    ];
  },
  toEsAggsFn: (column, columnId) => {
    return buildExpressionFunction<AggFunctionsMapping['aggCardinality']>('aggCardinality', {
      id: columnId,
      enabled: true,
      schema: 'metric',
      field: column.sourceField,
      // time shift is added to wrapping aggFilteredMetric if filter is set
      timeShift: column.filter ? undefined : column.timeShift,
      emptyAsNull: column.params?.emptyAsNull,
    }).toAst();
  },
  optimizeEsAggs: (_aggs, _esAggsIdMap, aggExpressionToEsAggsIdMap) => {
    let aggs = [..._aggs];
    const esAggsIdMap = { ..._esAggsIdMap };

    const aggKey = 'aggCardinality';

    const aggsByArgs = groupByKey<ExpressionAstExpressionBuilder>(aggs, (expressionBuilder) => {
      const {
        functions: [fnBuilder],
      } = expressionBuilder;

      let groupKey;

      if (fnBuilder.name === aggKey) {
        groupKey = `${fnBuilder.getArgument('field')?.[0]}-${
          fnBuilder.getArgument('timeShift')?.[0]
        }-${Boolean(fnBuilder.getArgument('emptyAsNull')?.[0])}`;
      }

      if (fnBuilder.name === 'aggFilteredMetric') {
        const metricFnBuilder = fnBuilder.getArgument('customMetric')?.[0].functions[0] as
          | ExpressionAstFunctionBuilder<AnyExpressionFunctionDefinition>
          | undefined;

        if (metricFnBuilder?.name === aggKey) {
          const aggFilterFnBuilder = (
            fnBuilder.getArgument('customBucket')?.[0] as ExpressionAstExpressionBuilder
          ).functions[0] as ExpressionAstFunctionBuilder<AggFunctionsMapping['aggFilter']>;

          groupKey = `filtered-${aggFilterFnBuilder.getArgument('timeWindow')}-${
            metricFnBuilder.getArgument('field')?.[0]
          }-${fnBuilder.getArgument('timeShift')?.[0]}`;

          const filterExpression = aggFilterFnBuilder.getArgument('filter')?.[0] as
            | ExpressionAstExpressionBuilder
            | undefined;

          if (filterExpression) {
            const filterFnBuilder = filterExpression.functions[0] as
              | ExpressionAstFunctionBuilder<ExpressionFunctionKql | ExpressionFunctionLucene>
              | undefined;

            groupKey += `-${filterFnBuilder?.name}-${filterFnBuilder?.getArgument('q')?.[0]}`;
          }
        }
      }

      return groupKey;
    });

    const termsFuncs = aggs
      .map((agg) => agg.functions[0])
      .filter((func) => func.name === 'aggTerms') as Array<
      ExpressionAstFunctionBuilder<AggFunctionsMapping['aggTerms']>
    >;

    // collapse them into a single expression builder
    Object.values(aggsByArgs).forEach((expressionBuilders) => {
      if (expressionBuilders.length <= 1) {
        // don't need to optimize if there aren't more than one
        return;
      }

      const [firstExpressionBuilder, ...restExpressionBuilders] = expressionBuilders;

      // throw away all but the first expression builder
      aggs = aggs.filter((aggBuilder) => !restExpressionBuilders.includes(aggBuilder));

      const firstEsAggsId = aggExpressionToEsAggsIdMap.get(firstExpressionBuilder);
      if (firstEsAggsId === undefined) {
        throw new Error('Could not find current column ID for expression builder');
      }

      restExpressionBuilders.forEach((expressionBuilder) => {
        const currentEsAggsId = aggExpressionToEsAggsIdMap.get(expressionBuilder);
        if (currentEsAggsId === undefined) {
          throw new Error('Could not find current column ID for expression builder');
        }

        esAggsIdMap[firstEsAggsId].push(...esAggsIdMap[currentEsAggsId]);

        delete esAggsIdMap[currentEsAggsId];

        termsFuncs.forEach((func) => {
          if (func.getArgument('orderBy')?.[0] === extractAggId(currentEsAggsId)) {
            func.replaceArgument('orderBy', [extractAggId(firstEsAggsId)]);
          }
        });
      });
    });

    return { aggs, esAggsIdMap };
  },
  onFieldChange: (oldColumn, field) => {
    return {
      ...oldColumn,
      label: ofName(field.displayName, oldColumn.timeShift, oldColumn.reducedTimeRange),
      sourceField: field.name,
    };
  },
  documentation: {
    section: 'elasticsearch',
    signature: i18n.translate('xpack.lens.indexPattern.cardinality.signature', {
      defaultMessage: 'field: string',
    }),
    description: i18n.translate('xpack.lens.indexPattern.cardinality.documentation.markdown', {
      defaultMessage: `
Calculates the number of unique values of a specified field. Works for number, string, date and boolean values.

Example: Calculate the number of different products:
\`unique_count(product.name)\`

Example: Calculate the number of different products from the "clothes" group:
\`unique_count(product.name, kql='product.group=clothes')\`
      `,
    }),
  },
};
