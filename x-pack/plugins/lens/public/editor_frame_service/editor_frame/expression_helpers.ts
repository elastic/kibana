/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Ast, fromExpression, toExpression } from '@kbn/interpreter';
import { ExpressionAstExpression, ExpressionValue } from '@kbn/expressions-plugin/common';
import type { DateRange } from '../../../common/types';
import { DatasourceStates } from '../../state_management';
import type { Visualization, DatasourceMap, DatasourceLayers, IndexPatternMap } from '../../types';

class ExpressionCache {
  cache: Record<string, { value?: ExpressionValue; expression: string; expireAt: number }>;
  expireTime: number;

  constructor() {
    this.cache = {};
    this.expireTime = 5 * 60 * 1000; // 5 minutes in milliseconds
  }

  set(key: string, expression: string) {
    const expireAt = Date.now() + this.expireTime;
    this.cache[key] = { expression, expireAt };
  }

  setValue(key: string, value: ExpressionValue) {
    if (this.cache[key]) {
      this.cache[key].value = value;
    }
  }

  get(key: string) {
    for (const record in this.cache) {
      if (this.cache[record]) {
        const item = this.cache[record];
        if (Date.now() > item.expireAt) {
          // Value has expired
          delete this.cache[record]; // Remove expired data
        }
      }
    }

    const data = this.cache[key];

    if (!data) {
      return null; // Key does not exist
    }

    return data; // Return the value if not expired
  }

  remove(key: string) {
    delete this.cache[key];
  }

  clear() {
    this.cache = {}; // Clear the entire cache
  }
}

export function getDataVariables(inputAst: ExpressionAstExpression) {
  const vars: string[] = [];
  const traverse = (ast: ExpressionAstExpression) => {
    ast.chain.forEach((f) => {
      if (f.function === 'var') {
        vars.push(f.arguments.name[0] as string);
      }
      for (const arg in f.arguments) {
        if (f.arguments[arg]) {
          f.arguments[arg].forEach((a) => {
            if (typeof a === 'object') {
              traverse(a);
            }
          });
        }
      }
    });
  };

  traverse(inputAst);

  const variables: Record<string, ExpressionValue> = {};
  vars.forEach((v) => {
    if (exprCache.get(v)?.value) {
      variables[v] = exprCache.get(v)?.value;
    }
  });

  return variables;
}

function loadFromCacheExpression(layerId: string): Ast {
  return {
    type: 'expression',
    chain: [
      {
        type: 'function',
        function: 'var',
        arguments: {
          name: [layerId],
        },
      },
    ],
  };
}

export const exprCache = new ExpressionCache();

export function getDatasourceExpressionsByLayers(
  datasourceMap: DatasourceMap,
  datasourceStates: DatasourceStates,
  indexPatterns: IndexPatternMap,
  dateRange: DateRange,
  nowInstant: Date,
  searchSessionId?: string
): null | Record<string, Ast> {
  const datasourceExpressions: Array<[string, Ast | string]> = [];

  Object.entries(datasourceMap).forEach(([datasourceId, datasource]) => {
    const state = datasourceStates[datasourceId]?.state;
    if (!state) {
      return;
    }

    const layers = datasource.getLayers(state);

    layers.forEach((layerId) => {
      const result = datasource.toExpression(
        state,
        layerId,
        indexPatterns,
        dateRange,
        nowInstant,
        searchSessionId
      );
      if (result) {
        datasourceExpressions.push([layerId, result]);
      }
    });
  });

  if (datasourceExpressions.length === 0) {
    return null;
  }

  return datasourceExpressions.reduce(
    (exprs, [layerId, expr]) => ({
      ...exprs,
      [layerId]: typeof expr === 'string' ? fromExpression(expr) : expr,
    }),
    {}
  );
}

export function buildExpression({
  visualization,
  visualizationState,
  datasourceMap,
  datasourceStates,
  datasourceLayers,
  title,
  description,
  indexPatterns,
  dateRange,
  nowInstant,
  searchSessionId,
  canUseCache = true,
}: {
  title?: string;
  description?: string;
  visualization: Visualization | null;
  visualizationState: unknown;
  datasourceMap: DatasourceMap;
  datasourceStates: DatasourceStates;
  datasourceLayers: DatasourceLayers;
  indexPatterns: IndexPatternMap;
  searchSessionId?: string;
  dateRange: DateRange;
  nowInstant: Date;
  // should be set to false when: 1. searchcontext changes (filters, query, timerange) or 2. refresh is clicked
  canUseCache?: boolean;
}): Ast | null {
  // if an unregistered visualization is passed in the SO
  // then this will be set as "undefined". Relax the check to catch both
  if (visualization == null) {
    return null;
  }

  const datasourceExpressionsByLayers = getDatasourceExpressionsByLayers(
    datasourceMap,
    datasourceStates,
    indexPatterns,
    dateRange,
    nowInstant,
    searchSessionId
  );

  // check if any of the datasource expressions should be loaded from cache
  for (const layerId in datasourceExpressionsByLayers) {
    if (datasourceExpressionsByLayers[layerId]) {
      const expr = toExpression(datasourceExpressionsByLayers[layerId]);

      const cacheItem = exprCache.get(layerId);
      if (cacheItem && cacheItem.expression === expr && cacheItem.value && canUseCache) {
        // and update it to var X
        datasourceExpressionsByLayers[layerId] = loadFromCacheExpression(layerId);
      } else {
        exprCache.set(layerId, expr);
      }
    }
  }

  const visualizationExpression = visualization.toExpression(
    visualizationState,
    datasourceLayers,
    {
      title,
      description,
    },
    datasourceExpressionsByLayers ?? undefined
  );

  if (datasourceExpressionsByLayers === null || visualizationExpression === null) {
    return null;
  }

  return typeof visualizationExpression === 'string'
    ? fromExpression(visualizationExpression)
    : visualizationExpression;
}
