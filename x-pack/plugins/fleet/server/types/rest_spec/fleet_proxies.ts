/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { PROXY_URL_REGEX } from '../../../common/constants';

function validateUrl(value: string) {
  if (!value.match(PROXY_URL_REGEX)) {
    return 'Invalid URL';
  }
}

export const FleetProxySchema = schema.object({
  id: schema.string(),
  url: schema.string({
    validate: validateUrl,
  }),
  name: schema.string(),
  proxy_headers: schema.nullable(
    schema.maybe(
      schema.recordOf(
        schema.string(),
        schema.oneOf([schema.string(), schema.boolean(), schema.number()])
      )
    )
  ),
  certificate_authorities: schema.nullable(schema.maybe(schema.string())),
  certificate: schema.nullable(schema.maybe(schema.string())),
  certificate_key: schema.nullable(schema.maybe(schema.string())),
  is_preconfigured: schema.boolean({ defaultValue: false }),
});

export const PostFleetProxyRequestSchema = {
  body: FleetProxySchema.extends({
    id: schema.maybe(schema.string()),
  }),
};

export const PutFleetProxyRequestSchema = {
  params: schema.object({ itemId: schema.string() }),
  body: schema.object({
    name: schema.maybe(schema.string()),
    url: schema.maybe(schema.string({ validate: validateUrl })),
    proxy_headers: schema.nullable(
      schema.recordOf(
        schema.string(),
        schema.oneOf([schema.string(), schema.boolean(), schema.number()])
      )
    ),
    certificate_authorities: schema.nullable(schema.string()),
    certificate: schema.nullable(schema.string()),
    certificate_key: schema.nullable(schema.string()),
  }),
};

export const GetOneFleetProxyRequestSchema = {
  params: schema.object({ itemId: schema.string() }),
};
