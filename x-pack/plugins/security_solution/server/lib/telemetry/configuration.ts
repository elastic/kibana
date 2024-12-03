/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import os from 'os';
import type {
  IndicesMetadataConfiguration,
  PaginationConfiguration,
  TelemetrySenderChannelConfiguration,
} from './types';

class TelemetryConfigurationDTO {
  private readonly DEFAULT_TELEMETRY_MAX_BUFFER_SIZE = 100;
  private readonly DEFAULT_MAX_SECURITY_LIST_TELEMETRY_BATCH = 100;
  private readonly DEFAULT_MAX_ENDPOINT_TELEMETRY_BATCH = 300;
  private readonly DEFAULT_MAX_DETECTION_RULE_TELEMETRY_BATCH = 1_000;
  private readonly DEFAULT_MAX_DETECTION_ALERTS_BATCH = 50;
  private readonly DEFAULT_ASYNC_SENDER = false;
  private readonly DEFAULT_SENDER_CHANNELS = {};
  private readonly DEFAULT_PAGINATION_CONFIG = {
    // default to 2% of host's total memory or 80MiB, whichever is smaller
    max_page_size_bytes: Math.min(os.totalmem() * 0.02, 80 * 1024 * 1024),
    num_docs_to_sample: 10,
  };
  private readonly DEFAULT_INDICES_METADATA_CONFIG = {
    indices_threshold: 15000,
    datastreams_threshold: 1000,

    max_prefixes: 10, // @deprecated
    max_group_size: 100, // @deprecated
    min_group_size: 5, // @deprecated
  };

  private _telemetry_max_buffer_size = this.DEFAULT_TELEMETRY_MAX_BUFFER_SIZE;
  private _max_security_list_telemetry_batch = this.DEFAULT_MAX_SECURITY_LIST_TELEMETRY_BATCH;
  private _max_endpoint_telemetry_batch = this.DEFAULT_MAX_ENDPOINT_TELEMETRY_BATCH;
  private _max_detection_rule_telemetry_batch = this.DEFAULT_MAX_DETECTION_RULE_TELEMETRY_BATCH;
  private _max_detection_alerts_batch = this.DEFAULT_MAX_DETECTION_ALERTS_BATCH;
  private _use_async_sender = this.DEFAULT_ASYNC_SENDER;
  private _sender_channels: {
    [key: string]: TelemetrySenderChannelConfiguration;
  } = this.DEFAULT_SENDER_CHANNELS;
  private _pagination_config: PaginationConfiguration = this.DEFAULT_PAGINATION_CONFIG;
  private _indices_metadata_config: IndicesMetadataConfiguration =
    this.DEFAULT_INDICES_METADATA_CONFIG;

  public get telemetry_max_buffer_size(): number {
    return this._telemetry_max_buffer_size;
  }

  public set telemetry_max_buffer_size(num: number) {
    this._telemetry_max_buffer_size = num;
  }

  public get max_security_list_telemetry_batch(): number {
    return this._max_security_list_telemetry_batch;
  }

  public set max_security_list_telemetry_batch(num: number) {
    this._max_security_list_telemetry_batch = num;
  }

  public get max_endpoint_telemetry_batch(): number {
    return this._max_endpoint_telemetry_batch;
  }

  public set max_endpoint_telemetry_batch(num: number) {
    this._max_endpoint_telemetry_batch = num;
  }

  public get max_detection_rule_telemetry_batch(): number {
    return this._max_detection_rule_telemetry_batch;
  }

  public set max_detection_rule_telemetry_batch(num: number) {
    this._max_detection_rule_telemetry_batch = num;
  }

  public get max_detection_alerts_batch(): number {
    return this._max_detection_alerts_batch;
  }

  public set max_detection_alerts_batch(num: number) {
    this._max_detection_alerts_batch = num;
  }

  public get use_async_sender(): boolean {
    return this._use_async_sender;
  }

  public set use_async_sender(num: boolean) {
    this._use_async_sender = num;
  }

  public set sender_channels(config: { [key: string]: TelemetrySenderChannelConfiguration }) {
    this._sender_channels = config;
  }

  public get sender_channels(): { [key: string]: TelemetrySenderChannelConfiguration } {
    return this._sender_channels;
  }

  public set pagination_config(paginationConfiguration: PaginationConfiguration) {
    this._pagination_config = paginationConfiguration;
  }

  public get pagination_config(): PaginationConfiguration {
    return this._pagination_config;
  }

  public set indices_metadata_config(paginationConfiguration: IndicesMetadataConfiguration) {
    this._indices_metadata_config = paginationConfiguration;
  }

  public get indices_metadata_config(): IndicesMetadataConfiguration {
    return this._indices_metadata_config;
  }

  public resetAllToDefault() {
    this._telemetry_max_buffer_size = this.DEFAULT_TELEMETRY_MAX_BUFFER_SIZE;
    this._max_security_list_telemetry_batch = this.DEFAULT_MAX_SECURITY_LIST_TELEMETRY_BATCH;
    this._max_endpoint_telemetry_batch = this.DEFAULT_MAX_ENDPOINT_TELEMETRY_BATCH;
    this._max_detection_rule_telemetry_batch = this.DEFAULT_MAX_DETECTION_RULE_TELEMETRY_BATCH;
    this._max_detection_alerts_batch = this.DEFAULT_MAX_DETECTION_ALERTS_BATCH;
    this._sender_channels = this.DEFAULT_SENDER_CHANNELS;
    this._pagination_config = this.DEFAULT_PAGINATION_CONFIG;
    this._indices_metadata_config = this.DEFAULT_INDICES_METADATA_CONFIG;
  }
}

export const telemetryConfiguration = new TelemetryConfigurationDTO();
