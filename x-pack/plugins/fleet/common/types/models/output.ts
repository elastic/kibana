/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { outputType } from '../../constants';
import type { ValueOf } from '..';
import type { kafkaAuthType, kafkaCompressionType, kafkaSaslMechanism } from '../../constants';
import type { kafkaPartitionType } from '../../constants';
import type { kafkaTopicWhenType } from '../../constants';

export type OutputType = typeof outputType;
export type KafkaCompressionType = typeof kafkaCompressionType;
export type KafkaAuthType = typeof kafkaAuthType;
export type KafkaSaslMechanism = typeof kafkaSaslMechanism;
export type KafkaPartitionType = typeof kafkaPartitionType;
export type KafkaTopicWhenType = typeof kafkaTopicWhenType;

interface NewBaseOutput {
  is_default: boolean;
  is_default_monitoring: boolean;
  is_preconfigured?: boolean;
  name: string;
  type: ValueOf<OutputType>;
  hosts?: string[];
  ca_sha256?: string | null;
  ca_trusted_fingerprint?: string | null;
  config_yaml?: string | null;
  ssl?: {
    certificate_authorities?: string[];
    certificate?: string;
    key?: string;
  } | null;
  proxy_id?: string | null;
  shipper?: ShipperOutput | null;
  allow_edit?: string[];
}

export interface NewElasticsearchOutput extends NewBaseOutput {
  type: OutputType['Elasticsearch'];
}

export interface NewLogstashOutput extends NewBaseOutput {
  type: OutputType['Logstash'];
}

export type NewOutput = NewElasticsearchOutput | NewLogstashOutput | KafkaOutput;

export type Output = NewOutput & {
  id: string;
};

export interface ShipperOutput {
  disk_queue_enabled?: boolean | null;
  disk_queue_path?: string | null;
  disk_queue_max_size?: number | null;
  disk_queue_encryption_enabled?: boolean | null;
  disk_queue_compression_enabled?: boolean | null;
  compression_level?: number | null;
  loadbalance?: boolean | null;
  mem_queue_events?: number | null;
  queue_flush_timeout?: number | null;
  max_batch_bytes?: number | null;
}

export interface KafkaOutput extends NewBaseOutput {
  type: OutputType['Kafka'];
  hosts?: string[];
  client_id?: string; // defaults to 'Elastic Agent'
  version?: string; // defaults to 1.0.0 by beats/agents if not set
  key?: string;
  compression?: ValueOf<KafkaCompressionType>; // defaults to 'gzip'
  compression_level?: number; // defaults to 4, only for gzip
  auth_type?: ValueOf<KafkaAuthType>;
  // user_pass auth
  username?: string;
  password?: string;
  sasl?: {
    mechanism?: ValueOf<KafkaSaslMechanism>;
  };
  partition?: ValueOf<KafkaPartitionType>;
  random?: {
    group_events?: number;
  };
  round_robin?: {
    group_events?: number;
  };
  hash?: {
    hash?: string;
    random?: boolean;
  };
  topics?: Array<{
    topic: string;
    when?: {
      type?: ValueOf<KafkaTopicWhenType>;
      conditional?: string;
    };
  }>;
  headers?: Array<{
    key: string;
    value: string;
  }>;
  timeout?: number;
  broker_timeout?: number;
}
