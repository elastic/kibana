/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep } from 'lodash';
import { fromExpression, toExpression, Ast, ExpressionFunctionAST } from '@kbn/interpreter/common';
import {
  SavedObjectMigrationMap,
  SavedObjectMigrationFn,
  SavedObjectReference,
  SavedObjectUnsanitizedDoc,
} from 'src/core/server';
import { Query, Filter } from 'src/plugins/data/public';
import { PersistableFilter } from '../common';

interface LensDocShapePre710<VisualizationState = unknown> {
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
        currentIndexPatternId: string;
        layers: Record<
          string,
          {
            columnOrder: string[];
            columns: Record<string, unknown>;
            indexPatternId: string;
          }
        >;
      };
    };
    visualization: VisualizationState;
    query: Query;
    filters: Filter[];
  };
}

interface LensDocShape<VisualizationState = unknown> {
  id?: string;
  type?: string;
  visualizationType: string | null;
  title: string;
  state: {
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
    query: Query;
    filters: PersistableFilter[];
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
const removeLensAutoDate: SavedObjectMigrationFn<LensDocShapePre710, LensDocShapePre710> = (
  doc,
  context
) => {
  const expression = doc.attributes.expression;
  if (!expression) {
    return doc;
  }
  try {
    const ast = fromExpression(expression);
    const newChain: ExpressionFunctionAST[] = ast.chain.map((topNode) => {
      if (topNode.function !== 'lens_merge_tables') {
        return topNode;
      }
      return {
        ...topNode,
        arguments: {
          ...topNode.arguments,
          tables: (topNode.arguments.tables as Ast[]).map((middleNode) => {
            return {
              type: 'expression',
              chain: middleNode.chain.map((node) => {
                // Check for sub-expression in aggConfigs
                if (
                  node.function === 'esaggs' &&
                  typeof node.arguments.aggConfigs[0] !== 'string'
                ) {
                  return {
                    ...node,
                    arguments: {
                      ...node.arguments,
                      aggConfigs: (node.arguments.aggConfigs[0] as Ast).chain[0].arguments
                        .aggConfigs,
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
  } catch (e) {
    context.log.warning(e.message);
    return { ...doc };
  }
};

/**
 * Adds missing timeField arguments to esaggs in the Lens expression
 */
const addTimeFieldToEsaggs: SavedObjectMigrationFn<LensDocShapePre710, LensDocShapePre710> = (
  doc,
  context
) => {
  const expression = doc.attributes.expression;
  if (!expression) {
    return doc;
  }

  try {
    const ast = fromExpression(expression);
    const newChain: ExpressionFunctionAST[] = ast.chain.map((topNode) => {
      if (topNode.function !== 'lens_merge_tables') {
        return topNode;
      }
      return {
        ...topNode,
        arguments: {
          ...topNode.arguments,
          tables: (topNode.arguments.tables as Ast[]).map((middleNode) => {
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
        expression: toExpression({ ...ast, chain: newChain }),
      },
    };
  } catch (e) {
    context.log.warning(e.message);
    return { ...doc };
  }
};

const removeInvalidAccessors: SavedObjectMigrationFn<
  LensDocShapePre710<XYStatePre77>,
  LensDocShapePre710<XYStatePost77>
> = (doc) => {
  const newDoc = cloneDeep(doc);
  if (newDoc.attributes.visualizationType === 'lnsXY') {
    const datasourceLayers = newDoc.attributes.state.datasourceStates.indexpattern.layers || {};
    const xyState = newDoc.attributes.state.visualization;
    (newDoc.attributes as LensDocShapePre710<
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

const extractReferences: SavedObjectMigrationFn<LensDocShapePre710, LensDocShape> = ({
  attributes,
  references,
  ...docMeta
}) => {
  const savedObjectReferences: SavedObjectReference[] = [];
  // add currently selected index pattern to reference list
  savedObjectReferences.push({
    type: 'index-pattern',
    id: attributes.state.datasourceStates.indexpattern.currentIndexPatternId,
    name: 'indexpattern-datasource-current-indexpattern',
  });

  // add layer index patterns to list and remove index pattern ids from layers
  const persistableLayers: Record<
    string,
    Omit<
      LensDocShapePre710['state']['datasourceStates']['indexpattern']['layers'][string],
      'indexPatternId'
    >
  > = {};
  Object.entries(attributes.state.datasourceStates.indexpattern.layers).forEach(
    ([layerId, { indexPatternId, ...persistableLayer }]) => {
      savedObjectReferences.push({
        type: 'index-pattern',
        id: indexPatternId,
        name: `indexpattern-datasource-layer-${layerId}`,
      });
      persistableLayers[layerId] = persistableLayer;
    }
  );

  // add filter index patterns to reference list and remove index pattern ids from filter definitions
  const persistableFilters = attributes.state.filters.map((filterRow, i) => {
    if (!filterRow.meta || !filterRow.meta.index) {
      return filterRow;
    }
    const refName = `filter-index-pattern-${i}`;
    savedObjectReferences.push({
      name: refName,
      type: 'index-pattern',
      id: filterRow.meta.index,
    });
    return {
      ...filterRow,
      meta: {
        ...filterRow.meta,
        indexRefName: refName,
        index: undefined,
      },
    };
  });

  // put together new saved object format
  const newDoc: SavedObjectUnsanitizedDoc<LensDocShape> = {
    ...docMeta,
    references: savedObjectReferences,
    attributes: {
      visualizationType: attributes.visualizationType,
      title: attributes.title,
      state: {
        datasourceStates: {
          indexpattern: {
            layers: persistableLayers,
          },
        },
        visualization: attributes.state.visualization,
        query: attributes.state.query,
        filters: persistableFilters,
      },
    },
  };

  return newDoc;
};

export const migrations: SavedObjectMigrationMap = {
  '7.7.0': removeInvalidAccessors,
  // The order of these migrations matter, since the timefield migration relies on the aggConfigs
  // sitting directly on the esaggs as an argument and not a nested function (which lens_auto_date was).
  '7.8.0': (doc, context) => addTimeFieldToEsaggs(removeLensAutoDate(doc, context), context),
  '7.10.0': extractReferences,
};
