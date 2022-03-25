/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { outputType } from '../../../common/constants';

export function validateLogstashHost(val: string) {
  if (val.match(/^http([s]){0,1}:\/\//)) {
    return 'Invalid logstash host should not start with http(s)';
  }

  try {
    const url = new URL(`http://${val}`);

    if (url.host !== val) {
      return 'Invalid host';
    }
  } catch (err) {
    return 'Invalid logstash host';
  }
}

const OutputBaseSchema = {
  id: schema.maybe(schema.string()),
  name: schema.string(),
  type: schema.oneOf([
    schema.literal(outputType.Elasticsearch),
    schema.literal(outputType.Logstash),
  ]),
  hosts: schema.conditional(
    schema.siblingRef('type'),
    schema.literal(outputType.Elasticsearch),
    schema.arrayOf(schema.uri({ scheme: ['http', 'https'] }), {
      minSize: 1,
    }),
    schema.arrayOf(schema.string({ validate: validateLogstashHost }), {
      minSize: 1,
    })
  ),
  is_default: schema.boolean({ defaultValue: false }),
  is_default_monitoring: schema.boolean({ defaultValue: false }),
  ca_sha256: schema.maybe(schema.string()),
  ca_trusted_fingerprint: schema.maybe(schema.string()),
  config_yaml: schema.maybe(schema.string()),
  ssl: schema.maybe(
    schema.object({
      certificate_authorities: schema.maybe(schema.arrayOf(schema.string())),
      certificate: schema.maybe(schema.string()),
      key: schema.maybe(schema.string()),
    })
  ),
};

export const NewOutputSchema = schema.object({ ...OutputBaseSchema });

export const UpdateOutputSchema = schema.object({
  name: schema.maybe(schema.string()),
  type: schema.maybe(
    schema.oneOf([schema.literal(outputType.Elasticsearch), schema.literal(outputType.Logstash)])
  ),
  hosts: schema.maybe(
    schema.oneOf([
      schema.arrayOf(schema.uri({ scheme: ['http', 'https'] })),
      schema.arrayOf(schema.string({ validate: validateLogstashHost })),
    ])
  ),
  is_default: schema.maybe(schema.boolean()),
  is_default_monitoring: schema.maybe(schema.boolean()),
  ca_sha256: schema.maybe(schema.string()),
  ca_trusted_fingerprint: schema.maybe(schema.string()),
  config_yaml: schema.maybe(schema.string()),
  ssl: schema.maybe(
    schema.object({
      certificate_authorities: schema.maybe(schema.arrayOf(schema.string())),
      certificate: schema.maybe(schema.string()),
      key: schema.maybe(schema.string()),
    })
  ),
});

export const OutputSchema = schema.object({
  ...OutputBaseSchema,
  id: schema.string(),
});
