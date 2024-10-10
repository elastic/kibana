/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TransportRequestParams } from '@elastic/elasticsearch';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { set } from '@kbn/safer-lodash-set';
import { evaluate } from '@kbn/tinymath';
import { JsonObject } from '@kbn/utility-types';
import { get, has, isArray, isEmpty } from 'lodash';
import { ApiScraperDefinition } from '../../../../../common/types';

const DOT = '.';

export async function createDocsFromApiDefinition(
  esClient: ElasticsearchClient,
  definition: ApiScraperDefinition
) {
  const params: TransportRequestParams = {
    method: definition.source.method,
    path: definition.source.endpoint,
  };

  if (!isEmpty(definition.source.params.body)) {
    params.body = definition.source.params.body;
  }

  if (!isEmpty(definition.source.params.query)) {
    params.querystring = definition.source.params.query;
  }

  const response = await esClient.transport.request(params);
  return extractEntities(definition, response);
}

function extractEntities(definition: ApiScraperDefinition, response: any) {
  return collectDocs(definition, response).map((doc: any) => {
    const id = definition.identityFields
      .reduce((acc, field) => {
        acc.push(get(doc, field));
        return acc;
      }, [] as string[])
      .join('-');
    const metrics = calcualteMetrics(definition, doc);

    const metadata = definition.metadata.reduce((acc, def) => {
      if (def.fromRoot) {
        set(acc, def.destination, get(response, def.source));
      } else if (def.expand != null && has(doc, def.source)) {
        const source = get(doc, def.source);
        const regex = new RegExp(def.expand.regex);
        const matches = regex.exec(source);
        if (matches) {
          const extractedValues = matches.slice(1, def.expand.map.length + 1);
          def.expand.map.forEach((field, index) => {
            set(acc, field, extractedValues[index]);
          });
        }
      } else {
        set(acc, def.destination, get(doc, def.source));
      }
      return acc;
    }, {} as Record<string, any>);

    return { id, metrics, ...metadata };
  });
}

function collectDocs(definition: ApiScraperDefinition, response: any): JsonObject[] {
  const { source } = definition;
  const root = source.collect.path === DOT ? response : get(response, source.collect.path);
  if (source.collect.keyed) {
    return Object.keys(root).map((key) => ({ ...get(root, key, {}), _key: key }));
  }
  if (!isArray(root)) {
    throw new Error('The collect path you specified does not resolve to an array');
  }
  return root;
}

function calcualteMetrics(definition: ApiScraperDefinition, doc: any) {
  if (!definition.metrics || definition.metrics.length === 0) {
    return {};
  }
  return definition.metrics.reduce((acc, metric) => {
    const values = metric.metrics.reduce((context, m) => {
      set(context, m.name, get(doc, m.path, 0));
      return context;
    }, {} as Record<string, number>);
    set(acc, metric.name, evaluateEquation(metric.equation, values));
    return acc;
  }, {} as Record<string, number | null>);
}

function evaluateEquation(equation: string, values: Record<string, number>) {
  try {
    return evaluate(equation, values);
  } catch (e) {
    return null;
  }
}
