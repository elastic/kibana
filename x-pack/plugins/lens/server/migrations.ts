/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep, flow } from 'lodash';
import { fromExpression, toExpression, Ast, ExpressionFunctionAST } from '@kbn/interpreter/common';
import { SavedObjectMigrationFn, SavedObjectUnsanitizedDoc } from 'src/core/server';

interface XYLayerPre77 {
  layerId: string;
  xAccessor: string;
  splitAccessor: string;
  accessors: string[];
}

function removeLensAutoDate(doc: SavedObjectUnsanitizedDoc) {
  const expression: string = doc.attributes?.expression;
  const ast = fromExpression(expression);

  const newChain: ExpressionFunctionAST[] = ast.chain.map(topNode => {
    if (topNode.function !== 'lens_merge_tables') {
      return topNode;
    }
    return {
      ...topNode,
      arguments: {
        ...topNode.arguments,
        tables: (topNode.arguments.tables as Ast[]).map(middleNode => {
          return {
            type: 'expression',
            chain: middleNode.chain.map(node => {
              if (node.function === 'esaggs') {
                return {
                  ...node,
                  arguments: {
                    ...node.arguments,
                    aggConfigs: (node.arguments.aggConfigs[0] as Ast).chain[0].arguments.aggConfigs,
                  },
                };
              }
              return node;
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
      expression: toExpression({ ...ast, chain: newChain }),
    },
  };
}

function addTimeFieldToEsaggs(doc: SavedObjectUnsanitizedDoc) {
  const expression: string = doc.attributes?.expression;
  const ast = fromExpression(expression);

  const newChain: ExpressionFunctionAST[] = ast.chain.map(topNode => {
    if (topNode.function !== 'lens_merge_tables') {
      return topNode;
    }
    return {
      ...topNode,
      arguments: {
        ...topNode.arguments,
        tables: (topNode.arguments.tables as Ast[]).map(middleNode => {
          return {
            type: 'expression',
            chain: middleNode.chain.map(node => {
              if (node.function !== 'esaggs') {
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
      expression: toExpression({ ...ast, chain: newChain }),
    },
  };
}

export const migrations: Record<string, SavedObjectMigrationFn> = {
  '7.7.0': doc => {
    const newDoc = cloneDeep(doc);
    if (newDoc.attributes?.visualizationType === 'lnsXY') {
      const datasourceState = newDoc.attributes.state?.datasourceStates?.indexpattern;
      const datasourceLayers = datasourceState?.layers ?? {};
      const xyState = newDoc.attributes.state?.visualization;
      newDoc.attributes.state.visualization.layers = xyState.layers.map((layer: XYLayerPre77) => {
        const layerId = layer.layerId;
        const datasource = datasourceLayers[layerId];
        return {
          ...layer,
          xAccessor: datasource?.columns[layer.xAccessor] ? layer.xAccessor : undefined,
          splitAccessor: datasource?.columns[layer.splitAccessor] ? layer.splitAccessor : undefined,
          accessors: layer.accessors.filter(accessor => !!datasource?.columns[accessor]),
        };
      }) as typeof xyState.layers;
    }
    return newDoc;
  },
  // The order of these migrations matter, since the timefield migration relies on the aggConfigs
  // sitting directly on the esaggs as an argument and not a nested function (which lens_auto_date was).
  '7.8.0': flow(removeLensAutoDate, addTimeFieldToEsaggs),
};
