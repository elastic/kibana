/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient } from 'kibana/public';
import { partition } from 'lodash';
import {
  AggFunctionsMapping,
  EsaggsExpressionFunctionDefinition,
  IndexPatternLoadExpressionFunctionDefinition,
} from '../../../../../src/plugins/data/public';
import {
  buildExpression,
  buildExpressionFunction,
  ExpressionAstExpression,
  ExpressionAstExpressionBuilder,
  ExpressionAstFunction,
} from '../../../../../src/plugins/expressions/public';
import { IndexPatternColumn } from './indexpattern';
import { operationDefinitionMap } from './operations';
import { IndexPattern, IndexPatternPrivateState, IndexPatternLayer } from './types';
import { OriginalColumn } from './rename_columns';
import { dateHistogramOperation } from './operations/definitions';

function getExpressionForLayer(
  layer: IndexPatternLayer,
  indexPattern: IndexPattern,
  uiSettings: IUiSettingsClient
): ExpressionAstExpression | null {
  const { columnOrder } = layer;
  if (columnOrder.length === 0 || !indexPattern) {
    return null;
  }

  const columns = { ...layer.columns };
  Object.keys(columns).forEach((columnId) => {
    const column = columns[columnId];
    const rootDef = operationDefinitionMap[column.operationType];
    if (
      'references' in column &&
      rootDef.filterable &&
      rootDef.input === 'fullReference' &&
      column.filter
    ) {
      // inherit filter to all referenced operations
      column.references.forEach((referenceColumnId) => {
        const referencedColumn = columns[referenceColumnId];
        const referenceDef = operationDefinitionMap[column.operationType];
        if (referenceDef.filterable) {
          columns[referenceColumnId] = { ...referencedColumn, filter: column.filter };
        }
      });
    }

    if (
      'references' in column &&
      rootDef.shiftable &&
      rootDef.input === 'fullReference' &&
      column.timeShift
    ) {
      // inherit time shift to all referenced operations
      column.references.forEach((referenceColumnId) => {
        const referencedColumn = columns[referenceColumnId];
        const referenceDef = operationDefinitionMap[column.operationType];
        if (referenceDef.shiftable) {
          columns[referenceColumnId] = { ...referencedColumn, timeShift: column.timeShift };
        }
      });
    }
  });

  const columnEntries = columnOrder.map((colId) => [colId, columns[colId]] as const);

  const [referenceEntries, esAggEntries] = partition(
    columnEntries,
    ([, col]) =>
      operationDefinitionMap[col.operationType]?.input === 'fullReference' ||
      operationDefinitionMap[col.operationType]?.input === 'managedReference'
  );

  if (referenceEntries.length || esAggEntries.length) {
    const aggs: ExpressionAstExpressionBuilder[] = [];
    const expressions: ExpressionAstFunction[] = [];

    sortedReferences(referenceEntries).forEach((colId) => {
      const col = columns[colId];
      const def = operationDefinitionMap[col.operationType];
      if (def.input === 'fullReference' || def.input === 'managedReference') {
        expressions.push(...def.toExpression(layer, colId, indexPattern));
      }
    });

    const orderedColumnIds = esAggEntries.map(([colId]) => colId);
    esAggEntries.forEach(([colId, col], index) => {
      const def = operationDefinitionMap[col.operationType];
      if (def.input !== 'fullReference' && def.input !== 'managedReference') {
        const wrapInFilter = Boolean(def.filterable && col.filter);
        let aggAst = def.toEsAggsFn(
          col,
          wrapInFilter ? `${index}-metric` : String(index),
          indexPattern,
          layer,
          uiSettings,
          orderedColumnIds
        );
        if (wrapInFilter) {
          aggAst = buildExpressionFunction<AggFunctionsMapping['aggFilteredMetric']>(
            'aggFilteredMetric',
            {
              id: String(index),
              enabled: true,
              schema: 'metric',
              customBucket: buildExpression([
                buildExpressionFunction<AggFunctionsMapping['aggFilter']>('aggFilter', {
                  id: `${index}-filter`,
                  enabled: true,
                  schema: 'bucket',
                  filter: JSON.stringify(col.filter),
                }),
              ]),
              customMetric: buildExpression({ type: 'expression', chain: [aggAst] }),
              timeShift: col.timeShift,
            }
          ).toAst();
        }
        aggs.push(
          buildExpression({
            type: 'expression',
            chain: [aggAst],
          })
        );
      }
    });

    const idMap = esAggEntries.reduce((currentIdMap, [colId, column], index) => {
      const esAggsId = `col-${index}-${index}`;
      return {
        ...currentIdMap,
        [esAggsId]: {
          ...column,
          id: colId,
        },
      };
    }, {} as Record<string, OriginalColumn>);

    type FormattedColumn = Required<
      Extract<
        IndexPatternColumn,
        | {
            params?: {
              format: unknown;
            };
          }
        // when formatters are nested there's a slightly different format
        | {
            params: {
              format?: unknown;
              parentFormat?: unknown;
            };
          }
      >
    >;
    const columnsWithFormatters = columnEntries.filter(
      ([, col]) =>
        col.params &&
        (('format' in col.params && col.params.format) ||
          ('parentFormat' in col.params && col.params.parentFormat))
    ) as Array<[string, FormattedColumn]>;
    const formatterOverrides: ExpressionAstFunction[] = columnsWithFormatters.map(
      ([id, col]: [string, FormattedColumn]) => {
        // TODO: improve the type handling here
        const parentFormat = 'parentFormat' in col.params ? col.params!.parentFormat! : undefined;
        const format = (col as FormattedColumn).params!.format;

        const base: ExpressionAstFunction = {
          type: 'function',
          function: 'lens_format_column',
          arguments: {
            format: format ? [format.id] : [''],
            columnId: [id],
            decimals: typeof format?.params?.decimals === 'number' ? [format.params.decimals] : [],
            parentFormat: parentFormat ? [JSON.stringify(parentFormat)] : [],
          },
        };

        return base;
      }
    );

    const firstDateHistogramColumn = columnEntries.find(
      ([, col]) => col.operationType === 'date_histogram'
    );

    const columnsWithTimeScale = firstDateHistogramColumn
      ? columnEntries.filter(
          ([, col]) =>
            col.timeScale &&
            operationDefinitionMap[col.operationType].timeScalingMode &&
            operationDefinitionMap[col.operationType].timeScalingMode !== 'disabled'
        )
      : [];
    const timeScaleFunctions: ExpressionAstFunction[] = columnsWithTimeScale.flatMap(
      ([id, col]) => {
        const scalingCall: ExpressionAstFunction = {
          type: 'function',
          function: 'lens_time_scale',
          arguments: {
            dateColumnId: [firstDateHistogramColumn![0]],
            inputColumnId: [id],
            outputColumnId: [id],
            outputColumnName: [col.label],
            targetUnit: [col.timeScale!],
          },
        };

        const formatCall: ExpressionAstFunction = {
          type: 'function',
          function: 'lens_format_column',
          arguments: {
            format: [''],
            columnId: [id],
            parentFormat: [JSON.stringify({ id: 'suffix', params: { unit: col.timeScale } })],
          },
        };

        return [scalingCall, formatCall];
      }
    );

    if (esAggEntries.length === 0) {
      return {
        type: 'expression',
        chain: [
          {
            type: 'function',
            function: 'createTable',
            arguments: {
              ids: [],
              names: [],
              rowCount: [1],
            },
          },
          ...expressions,
          ...formatterOverrides,
          ...timeScaleFunctions,
        ],
      };
    }

    const allDateHistogramFields = Object.values(columns)
      .map((column) =>
        column.operationType === dateHistogramOperation.type ? column.sourceField : null
      )
      .filter((field): field is string => Boolean(field));

    return {
      type: 'expression',
      chain: [
        buildExpressionFunction<EsaggsExpressionFunctionDefinition>('esaggs', {
          index: buildExpression([
            buildExpressionFunction<IndexPatternLoadExpressionFunctionDefinition>(
              'indexPatternLoad',
              { id: indexPattern.id }
            ),
          ]),
          aggs,
          metricsAtAllLevels: false,
          partialRows: false,
          timeFields: allDateHistogramFields,
        }).toAst(),
        {
          type: 'function',
          function: 'lens_rename_columns',
          arguments: {
            idMap: [JSON.stringify(idMap)],
          },
        },
        ...expressions,
        ...formatterOverrides,
        ...timeScaleFunctions,
      ],
    };
  }

  return null;
}

// Topologically sorts references so that we can execute them in sequence
function sortedReferences(columns: Array<readonly [string, IndexPatternColumn]>) {
  const allNodes: Record<string, string[]> = {};
  columns.forEach(([id, col]) => {
    allNodes[id] = 'references' in col ? col.references : [];
  });
  // remove real metric references
  columns.forEach(([id]) => {
    allNodes[id] = allNodes[id].filter((refId) => !!allNodes[refId]);
  });
  const ordered: string[] = [];

  while (ordered.length < columns.length) {
    Object.keys(allNodes).forEach((id) => {
      if (allNodes[id].length === 0) {
        ordered.push(id);
        delete allNodes[id];
        Object.keys(allNodes).forEach((k) => {
          allNodes[k] = allNodes[k].filter((i) => i !== id);
        });
      }
    });
  }

  return ordered;
}

export function toExpression(
  state: IndexPatternPrivateState,
  layerId: string,
  uiSettings: IUiSettingsClient
) {
  if (state.layers[layerId]) {
    return getExpressionForLayer(
      state.layers[layerId],
      state.indexPatterns[state.layers[layerId].indexPatternId],
      uiSettings
    );
  }

  return null;
}
