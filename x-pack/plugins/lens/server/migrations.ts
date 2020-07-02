/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep } from 'lodash';
import { SavedObjectMigrationMap, SavedObjectMigrationFn } from 'src/core/server';
import { EsaggsExpressionFunctionDefinition } from 'src/plugins/data/server';
import {
  buildExpression,
  ExpressionAstExpression,
  ExpressionAstExpressionBuilder,
  ExpressionAstFunction,
  formatExpression,
  isExpressionAstBuilder,
  parseExpression,
} from '../../../../src/plugins/expressions/server';
import { MergeTablesExpressionFunctionDefinition } from '../common';

interface LensDocShape<VisualizationState = unknown> {
  id?: string;
  type?: string;
  visualizationType: string | null;
  title: string;
  expression: string | null;
  state: {
    datasourceMetaData: {
      filterableIndexPatterns: Array<{ id: string; title: string }>;
    };
    datasourceStates: {
      // This is hardcoded as our only datasource
      indexpattern: {
        layers: Record<
          string,
          {
            columnOrder: string[];
            columns: Record<string, unknown>;
          }
        >;
      };
    };
    visualization: VisualizationState;
    query: unknown;
    filters: unknown[];
  };
}

interface XYLayerPre77 {
  layerId: string;
  xAccessor: string;
  splitAccessor: string;
  accessors: string[];
}

interface XYStatePre77 {
  layers: XYLayerPre77[];
}

interface XYStatePost77 {
  layers: Array<Partial<XYLayerPre77>>;
}

/**
 * Removes the `lens_auto_date` subexpression from a stored expression
 * string. For example: aggConfigs={lens_auto_date aggConfigs="JSON string"}
 */
const removeLensAutoDate: SavedObjectMigrationFn<LensDocShape, LensDocShape> = (doc, context) => {
  const expression = doc.attributes.expression;
  if (!expression) {
    return doc;
  }
  try {
    const ast = buildExpression(expression);
    ast.findFunction<MergeTablesExpressionFunctionDefinition>('lens_merge_tables').forEach((fn) => {
      const arg = fn.getArgument('tables');
      if (arg) {
        const tables = arg.reduce((acc, table) => {
          if (isExpressionAstBuilder(table)) {
            const esaggs = table.findFunction<EsaggsExpressionFunctionDefinition>('esaggs')[0];
            const aggConfigs = esaggs.getArgument('aggConfigs');
            if (aggConfigs) {
              aggConfigs.forEach((aggConfig) => {
                if (isExpressionAstBuilder(aggConfig)) {
                  const autoDateAggConfigs = aggConfig
                    .findFunction('lens_auto_date')[0]
                    .getArgument('aggConfigs');
                  if (autoDateAggConfigs) {
                    esaggs.replaceArgument('aggConfigs', autoDateAggConfigs);
                  }
                }
              });
            }
            acc.push(table);
          }
          return acc;
        }, [] as ExpressionAstExpressionBuilder[]);

        fn.replaceArgument('tables', tables);
      }
    });

    return {
      ...doc,
      attributes: {
        ...doc.attributes,
        expression: ast.toString(),
      },
    };
  } catch (e) {
    context.log.warning(e.message);
    return { ...doc };
  }
};

/**
 * Adds missing timeField arguments to esaggs in the Lens expression
 */
const addTimeFieldToEsaggs: SavedObjectMigrationFn<LensDocShape, LensDocShape> = (doc, context) => {
  const expression = doc.attributes.expression;
  if (!expression) {
    return doc;
  }

  try {
    const ast = parseExpression(expression);
    const newChain: ExpressionAstFunction[] = ast.chain.map((topNode) => {
      if (topNode.function !== 'lens_merge_tables') {
        return topNode;
      }
      return {
        ...topNode,
        arguments: {
          ...topNode.arguments,
          tables: (topNode.arguments.tables as ExpressionAstExpression[]).map((middleNode) => {
            return {
              type: 'expression',
              chain: middleNode.chain.map((node) => {
                // Skip if there are any timeField arguments already, because that indicates
                // the fix is already applied
                if (node.function !== 'esaggs' || node.arguments.timeFields) {
                  return node;
                }
                const timeFields: string[] = [];
                JSON.parse(node.arguments.aggConfigs[0] as string).forEach(
                  (agg: { type: string; params: { field: string } }) => {
                    if (agg.type !== 'date_histogram') {
                      return;
                    }
                    timeFields.push(agg.params.field);
                  }
                );
                return {
                  ...node,
                  arguments: {
                    ...node.arguments,
                    timeFields,
                  },
                };
              }),
            };
          }),
        },
      };
    });

    return {
      ...doc,
      attributes: {
        ...doc.attributes,
        expression: formatExpression({ ...ast, chain: newChain }),
      },
    };
  } catch (e) {
    context.log.warning(e.message);
    return { ...doc };
  }
};

const removeInvalidAccessors: SavedObjectMigrationFn<
  LensDocShape<XYStatePre77>,
  LensDocShape<XYStatePost77>
> = (doc) => {
  const newDoc = cloneDeep(doc);
  if (newDoc.attributes.visualizationType === 'lnsXY') {
    const datasourceLayers = newDoc.attributes.state.datasourceStates.indexpattern.layers || {};
    const xyState = newDoc.attributes.state.visualization;
    (newDoc.attributes as LensDocShape<
      XYStatePost77
    >).state.visualization.layers = xyState.layers.map((layer: XYLayerPre77) => {
      const layerId = layer.layerId;
      const datasource = datasourceLayers[layerId];
      return {
        ...layer,
        xAccessor: datasource?.columns[layer.xAccessor] ? layer.xAccessor : undefined,
        splitAccessor: datasource?.columns[layer.splitAccessor] ? layer.splitAccessor : undefined,
        accessors: layer.accessors.filter((accessor) => !!datasource?.columns[accessor]),
      };
    });
  }
  return newDoc;
};

export const migrations: SavedObjectMigrationMap = {
  '7.7.0': removeInvalidAccessors,
  // The order of these migrations matter, since the timefield migration relies on the aggConfigs
  // sitting directly on the esaggs as an argument and not a nested function (which lens_auto_date was).
  '7.8.0': (doc, context) => addTimeFieldToEsaggs(removeLensAutoDate(doc, context), context),
};
