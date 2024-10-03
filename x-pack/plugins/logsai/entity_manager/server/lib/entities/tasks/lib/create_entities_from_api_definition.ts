/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { APIEntityDefinition, ENTITY_SCHEMA_VERSION_V1 } from '@kbn/entities-schema';
import { set } from '@kbn/safer-lodash-set';
import { evaluate } from '@kbn/tinymath';
import { JsonObject } from '@kbn/utility-types';
import { get, isArray } from 'lodash';
import * as mustache from 'mustache';

export async function createEntitiesFromApiDefinition(
  esClient: ElasticsearchClient,
  definition: APIEntityDefinition
) {
  const response = await esClient.transport.request({
    method: definition.source.method,
    path: definition.source.endpoint,
  });
  return extractEntities(definition, response);
}

function extractEntities(definition: APIEntityDefinition, response: any) {
  return collectDocs(definition, response).map((doc: any) => {
    const id = definition.identityFields
      .reduce((acc, field) => {
        acc.push(get(doc, field));
        return acc;
      }, [] as string[])
      .join('-');
    const entity = {
      id,
      defintionId: definition.id,
      identityFields: definition.identityFields,
      definitionVersion: definition.version,
      schemaVersion: ENTITY_SCHEMA_VERSION_V1,
      metrics: calcualteMetrics(definition, doc),
    };

    const metadata = definition.metadata.reduce((acc, def) => {
      if (def.fromRoot) {
        set(acc, def.destination, get(response, def.source));
      } else {
        set(acc, def.destination, get(doc, def.source));
      }
      return acc;
    }, {} as Record<string, any>);

    const displayName = mustache.render(definition.displayNameTemplate || '{{entity.id}}', doc);

    return { entity: { ...entity, displayName }, ...metadata };
  });
}

function collectDocs(definition: APIEntityDefinition, response: any): JsonObject[] {
  const { source } = definition;
  const root = get(response, source.collect.path);
  if (source.collect.keyed) {
    return Object.keys(root).map((key) => ({ ...get(root, key, {}), _key: key }));
  }
  if (!isArray(root)) {
    throw new Error('The collect path you specified does not resolve to an array');
  }
  return root;
}

function calcualteMetrics(definition: APIEntityDefinition, doc: any) {
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
