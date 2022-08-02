/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import {
  IRouter,
  RequestHandlerContext,
  KibanaRequest,
  IKibanaResponse,
  KibanaResponseFactory,
  ElasticsearchClient,
} from '@kbn/core/server';
import { Logger } from '@kbn/core/server';

const bodySchema = schema.object({
  indexPatterns: schema.arrayOf(schema.string()),
});

type RequestBody = TypeOf<typeof bodySchema>;

export function createFieldsRoute(logger: Logger, router: IRouter, baseRoute: string) {
  const path = `${baseRoute}/_fields`;
  logger.debug(`registering indexThreshold route POST ${path}`);
  router.post(
    {
      path,
      validate: {
        body: bodySchema,
      },
    },
    handler
  );

  async function handler(
    ctx: RequestHandlerContext,
    req: KibanaRequest<unknown, unknown, RequestBody>,
    res: KibanaResponseFactory
  ): Promise<IKibanaResponse> {
    logger.debug(`route ${path} request: ${JSON.stringify(req.body)}`);

    let rawFields: RawFields;

    // special test for no patterns, otherwise all are returned!
    if (req.body.indexPatterns.length === 0) {
      return res.ok({ body: { fields: [] } });
    }

    try {
      const esClient = (await ctx.core).elasticsearch.client.asCurrentUser;
      rawFields = await getRawFields(esClient, req.body.indexPatterns);
    } catch (err) {
      const indexPatterns = req.body.indexPatterns.join(',');
      logger.warn(
        `route ${path} error getting fields from pattern "${indexPatterns}": ${err.message}`
      );
      return res.ok({ body: { fields: [] } });
    }

    const result = { fields: getFieldsFromRawFields(rawFields) };

    logger.debug(`route ${path} response: ${JSON.stringify(result)}`);
    return res.ok({ body: result });
  }
}

// RawFields is a structure with the following shape:
// {
//   "fields": {
//     "_routing": { "_routing": { "type": "_routing", "searchable": true, "aggregatable": false}},
//     "host":     { "keyword":  { "type": "keyword",  "searchable": true, "aggregatable": true}},
//     ...
// }
interface RawFields {
  fields: Record<string, Record<string, RawField>>;
}

interface RawField {
  type: string;
  searchable: boolean;
  aggregatable: boolean;
}

interface Field {
  name: string;
  type: string;
  normalizedType: string;
  searchable: boolean;
  aggregatable: boolean;
}

async function getRawFields(esClient: ElasticsearchClient, indexes: string[]): Promise<RawFields> {
  const params = {
    index: indexes,
    fields: ['*'],
    ignore_unavailable: true,
    allow_no_indices: true,
  };
  const result = await esClient.fieldCaps(params);
  return result as RawFields;
}

function getFieldsFromRawFields(rawFields: RawFields): Field[] {
  const result: Field[] = [];

  if (!rawFields || !rawFields.fields) {
    return [];
  }

  for (const name of Object.keys(rawFields.fields)) {
    const rawField = rawFields.fields[name];
    const type = Object.keys(rawField)[0];
    const values = rawField[type];

    if (!type || type.startsWith('_')) continue;
    if (!values) continue;

    const normalizedType = normalizedFieldTypes[type] || type;
    const aggregatable = values.aggregatable;
    const searchable = values.searchable;

    result.push({ name, type, normalizedType, aggregatable, searchable });
  }

  result.sort((a, b) => a.name.localeCompare(b.name));
  return result;
}

const normalizedFieldTypes: Record<string, string> = {
  long: 'number',
  integer: 'number',
  short: 'number',
  byte: 'number',
  double: 'number',
  float: 'number',
  half_float: 'number',
  scaled_float: 'number',
};
