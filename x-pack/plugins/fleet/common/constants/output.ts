/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NewOutput } from '../types';

export const OUTPUT_SAVED_OBJECT_TYPE = 'ingest-outputs';

export const outputType = {
  Elasticsearch: 'elasticsearch',
  Logstash: 'logstash',
  Kafka: 'kafka',
} as const;

export const DEFAULT_OUTPUT_ID = 'fleet-default-output';

export const DEFAULT_OUTPUT: NewOutput = {
  name: 'default',
  is_default: true,
  is_default_monitoring: true,
  type: outputType.Elasticsearch,
  hosts: [''],
};

export const LICENCE_FOR_PER_POLICY_OUTPUT = 'platinum';

/**
 * Kafka constants
 */

export const kafkaCompressionType = {
  None: 'none',
  Snappy: 'snappy',
  Lz4: 'lz4',
  Gzip: 'gzip',
} as const;

export const kafkaAuthType = {
  Userpass: 'user_pass',
  Ssl: 'ssl',
  Kerberos: 'kerberos',
} as const;

export const kafkaSaslMechanism = {
  Plain: 'PLAIN',
  ScramSha256: 'SCRAM-SHA-256',
  ScramSha512: 'SCRAM-SHA-512',
} as const;

export const kafkaPartitionType = {
  Random: 'random',
  RoundRobin: 'round_robin',
  Hash: 'hash',
} as const;

export const kafkaTopicWhenType = {
  Equals: 'equals',
  Contains: 'contains',
  Regexp: 'regexp',
  Range: 'range',
  Network: 'network',
  HasFields: 'has_fields',
  Or: 'or',
  And: 'and',
  Not: 'not',
} as const;

export const kafkaAcknowledgeReliabilityLevel = {
  Commit: 'Wait for local commit',
  Replica: 'Wait for all replicas to commit',
  DoNotWait: 'Do not wait',
} as const;

export const kafkaSupportedVersions = [
  '0.8.2.0',
  '0.8.2.1',
  '0.8.2.2',
  '0.9.0.0',
  '0.9.0.1',
  '0.10.0.0',
  '0.10.0.1',
  '0.10.1.0',
  '0.10.1.1',
  '0.10.2.0',
  '0.10.2.1',
  '0.10.2.2',
  '0.11.0.0',
  '0.11.0.1',
  '0.11.0.2',
  '0.11.0.3',
  '1.0.0',
  '1.0.1',
  '1.0.2',
  '1.1.0',
  '1.1.1',
  '2.0.0',
  '2.0.1',
  '2.1.0',
  '2.1.1',
  '2.2.0',
  '2.2.1',
  '2.2.2',
  '2.3.0',
  '2.3.1',
  '2.4.0',
  '2.4.1',
  '2.5.0',
  '2.5.1',
  '2.6.0',
];
