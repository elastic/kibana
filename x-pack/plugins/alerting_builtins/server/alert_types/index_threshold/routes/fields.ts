/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// the business logic of this code is from watcher, in:
//   x-pack/plugins/watcher/server/routes/api/register_list_fields_route.ts

import { schema, TypeOf } from '@kbn/config-schema';
import {
  IRouter,
  RequestHandlerContext,
  KibanaRequest,
  IKibanaResponse,
  KibanaResponseFactory,
  ILegacyScopedClusterClient,
} from 'kibana/server';
import { Service } from '../../../types';

const bodySchema = schema.object({
  indexPatterns: schema.arrayOf(schema.string()),
});

type RequestBody = TypeOf<typeof bodySchema>;

export function createFieldsRoute(service: Service, router: IRouter, baseRoute: string) {
  const path = `${baseRoute}/_fields`;
  service.logger.debug(`registering indexThreshold route POST ${path}`);
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
    service.logger.debug(`route ${path} request: ${JSON.stringify(req.body)}`);

    let rawFields: RawFields;

    // special test for no patterns, otherwise all are returned!
    if (req.body.indexPatterns.length === 0) {
      return res.ok({ body: { fields: [] } });
    }

    try {
      rawFields = await getRawFields(ctx.core.elasticsearch.legacy.client, req.body.indexPatterns);
    } catch (err) {
      const indexPatterns = req.body.indexPatterns.join(',');
      service.logger.warn(
        `route ${path} error getting fields from pattern "${indexPatterns}": ${err.message}`
      );
      return res.ok({ body: { fields: [] } });
    }

    const result = { fields: getFieldsFromRawFields(rawFields) };

    service.logger.debug(`route ${path} response: ${JSON.stringify(result)}`);
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

async function getRawFields(
  dataClient: ILegacyScopedClusterClient,
  indexes: string[]
): Promise<RawFields> {
  const params = {
    index: indexes,
    fields: ['*'],
    ignoreUnavailable: true,
    allowNoIndices: true,
    ignore: 404,
  };
  const result = await dataClient.callAsCurrentUser('fieldCaps', params);
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
