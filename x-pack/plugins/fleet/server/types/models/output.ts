/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import {
  kafkaAcknowledgeReliabilityLevel,
  kafkaAuthType,
  kafkaCompressionType,
  kafkaPartitionType,
  kafkaSaslMechanism,
  kafkaTopicWhenType,
  outputType,
} from '../../../common/constants';

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

/**
 * Base schemas
 */

const BaseSchema = {
  id: schema.maybe(schema.string()),
  name: schema.string(),
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

const UpdateSchema = {
  ...BaseSchema,
  name: schema.maybe(schema.string()),
  is_default: schema.maybe(schema.boolean()),
  is_default_monitoring: schema.maybe(schema.boolean()),
};

/**
 * Elasticsearch schemas
 */

export const ElasticSearchSchema = {
  ...BaseSchema,
  type: schema.literal(outputType.Elasticsearch),
  hosts: schema.arrayOf(schema.uri({ scheme: ['http', 'https'] }), { minSize: 1 }),
};

const ElasticSearchUpdateSchema = {
  ...UpdateSchema,
  type: schema.maybe(schema.literal(outputType.Elasticsearch)),
  hosts: schema.maybe(schema.arrayOf(schema.uri({ scheme: ['http', 'https'] }), { minSize: 1 })),
};

/**
 * Logstash schemas
 */

export const LogstashSchema = {
  ...BaseSchema,
  type: schema.literal(outputType.Logstash),
  hosts: schema.arrayOf(schema.string({ validate: validateLogstashHost }), { minSize: 1 }),
};

const LogstashUpdateSchema = {
  ...UpdateSchema,
  type: schema.maybe(schema.literal(outputType.Logstash)),
  hosts: schema.maybe(
    schema.arrayOf(schema.string({ validate: validateLogstashHost }), { minSize: 1 })
  ),
};

/**
 * Kafka schemas
 */

const KafkaTopicsSchema = schema.arrayOf(
  schema.object({
    topic: schema.string(),
    when: schema.maybe(
      schema.object({
        type: schema.maybe(
          schema.oneOf([
            schema.literal(kafkaTopicWhenType.And),
            schema.literal(kafkaTopicWhenType.Not),
            schema.literal(kafkaTopicWhenType.Or),
            schema.literal(kafkaTopicWhenType.Equals),
            schema.literal(kafkaTopicWhenType.Contains),
            schema.literal(kafkaTopicWhenType.Regexp),
            schema.literal(kafkaTopicWhenType.HasFields),
            schema.literal(kafkaTopicWhenType.Network),
            schema.literal(kafkaTopicWhenType.Range),
          ])
        ),
        condition: schema.maybe(schema.string()),
      })
    ),
  }),
  { minSize: 1 }
);

export const KafkaSchema = {
  ...BaseSchema,
  type: schema.literal(outputType.Kafka),
  hosts: schema.arrayOf(schema.uri({ scheme: ['http', 'https'] }), { minSize: 1 }),
  version: schema.maybe(schema.string()),
  key: schema.maybe(schema.string()),
  compression: schema.maybe(
    schema.oneOf([
      schema.literal(kafkaCompressionType.Gzip),
      schema.literal(kafkaCompressionType.Snappy),
      schema.literal(kafkaCompressionType.Lz4),
    ])
  ),
  compression_level: schema.conditional(
    schema.siblingRef('compression'),
    schema.string(),
    schema.number(),
    schema.never()
  ),
  client_id: schema.maybe(schema.string()),
  auth_type: schema.oneOf([
    schema.literal(kafkaAuthType.Userpass),
    schema.literal(kafkaAuthType.Ssl),
    schema.literal(kafkaAuthType.Kerberos),
  ]),
  username: schema.conditional(
    schema.siblingRef('auth_type'),
    kafkaAuthType.Userpass,
    schema.string(),
    schema.never()
  ),
  password: schema.conditional(
    schema.siblingRef('username'),
    schema.string(),
    schema.string(),
    schema.never()
  ),
  sasl: schema.maybe(
    schema.object({
      mechanism: schema.maybe(
        schema.oneOf([
          schema.literal(kafkaSaslMechanism.Plain),
          schema.literal(kafkaSaslMechanism.ScramSha256),
          schema.literal(kafkaSaslMechanism.ScramSha512),
        ])
      ),
    })
  ),
  partition: schema.maybe(
    schema.oneOf([
      schema.literal(kafkaPartitionType.Random),
      schema.literal(kafkaPartitionType.RoundRobin),
      schema.literal(kafkaPartitionType.Hash),
    ])
  ),
  random: schema.maybe(schema.object({ group_events: schema.maybe(schema.number()) })),
  round_robin: schema.maybe(schema.object({ group_events: schema.maybe(schema.number()) })),
  hash: schema.maybe(
    schema.object({ hash: schema.maybe(schema.string()), random: schema.maybe(schema.boolean()) })
  ),
  topics: KafkaTopicsSchema,
  headers: schema.maybe(
    schema.arrayOf(schema.object({ key: schema.string(), value: schema.string() }))
  ),
  timeout: schema.maybe(schema.number()),
  broker_timeout: schema.maybe(schema.number()),
  broker_buffer_size: schema.maybe(schema.number()),
  broker_ack_reliability: schema.maybe(
    schema.oneOf([
      schema.literal(kafkaAcknowledgeReliabilityLevel.Commit),
      schema.literal(kafkaAcknowledgeReliabilityLevel.Replica),
      schema.literal(kafkaAcknowledgeReliabilityLevel.DoNotWait),
    ])
  ),
};

const KafkaUpdateSchema = {
  ...UpdateSchema,
  ...KafkaSchema,
  type: schema.maybe(schema.literal(outputType.Kafka)),
  hosts: schema.maybe(schema.arrayOf(schema.uri({ scheme: ['http', 'https'] }), { minSize: 1 })),
  auth_type: schema.maybe(
    schema.oneOf([
      schema.literal(kafkaAuthType.Userpass),
      schema.literal(kafkaAuthType.Ssl),
      schema.literal(kafkaAuthType.Kerberos),
    ])
  ),
  topics: schema.maybe(KafkaTopicsSchema),
};

export const OutputSchema = schema.oneOf([
  schema.object({ ...ElasticSearchSchema }),
  schema.object({ ...LogstashSchema }),
  schema.object({ ...KafkaSchema }),
]);

export const UpdateOutputSchema = schema.oneOf([
  schema.object({ ...ElasticSearchUpdateSchema }),
  schema.object({ ...LogstashUpdateSchema }),
  schema.object({ ...KafkaUpdateSchema }),
]);
