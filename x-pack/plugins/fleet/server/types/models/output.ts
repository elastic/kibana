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
    return 'Host address must begin with a domain name or IP address';
  }

  try {
    const url = new URL(`http://${val}`);

    if (url.host !== val) {
      return 'Invalid host';
    }
  } catch (err) {
    return 'Invalid Logstash host';
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
  proxy_id: schema.nullable(schema.string()),
  shipper: schema.maybe(
    schema.object({
      disk_queue_enabled: schema.nullable(schema.boolean({ defaultValue: false })),
      disk_queue_path: schema.nullable(schema.string()),
      disk_queue_max_size: schema.nullable(schema.number()),
      disk_queue_encryption_enabled: schema.nullable(schema.boolean()),
      disk_queue_compression_enabled: schema.nullable(schema.boolean()),
      compression_level: schema.nullable(schema.number()),
      loadbalance: schema.nullable(schema.boolean()),
      mem_queue_events: schema.nullable(schema.number()),
      queue_flush_timeout: schema.nullable(schema.number()),
      max_batch_bytes: schema.nullable(schema.number()),
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
  proxy_id: schema.nullable(schema.string()),
  shipper: schema.maybe(
    schema.object({
      disk_queue_enabled: schema.nullable(schema.boolean({ defaultValue: false })),
      disk_queue_path: schema.nullable(schema.string()),
      disk_queue_max_size: schema.nullable(schema.number()),
      disk_queue_encryption_enabled: schema.nullable(schema.boolean()),
      disk_queue_compression_enabled: schema.nullable(schema.boolean()),
      compression_level: schema.nullable(schema.number()),
      loadbalance: schema.nullable(schema.boolean()),
      mem_queue_events: schema.nullable(schema.number()),
      queue_flush_timeout: schema.nullable(schema.number()),
      max_batch_bytes: schema.nullable(schema.number()),
    })
  ),
});

export const OutputSchema = schema.object({
  ...OutputBaseSchema,
  id: schema.string(),
});
