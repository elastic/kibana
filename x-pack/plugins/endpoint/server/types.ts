/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { LoggerFactory } from 'kibana/server';
import { EndpointConfigType } from './config';

export interface EndpointAppContext {
  logFactory: LoggerFactory;
  config(): Promise<EndpointConfigType>;
}

export class EndpointAppConstants {
  static ENDPOINT_INDEX_NAME = 'endpoint-agent*';
}

export interface EndpointData {
  machine_id: string;
  created_at: Date;
  host: {
    name: string;
    hostname: string;
    ip: string;
    mac_address: string;
    os: {
      name: string;
      full: string;
    };
  };
  endpoint: {
    domain: string;
    is_base_image: boolean;
    active_directory_distinguished_name: string;
    active_directory_hostname: string;
    upgrade: {
      status?: string;
      updated_at?: Date;
    };
    isolation: {
      status: boolean;
      request_status?: string | boolean;
      updated_at?: Date;
    };
    policy: {
      name: string;
      id: string;
    };
    sensor: {
      persistence: boolean;
      status: object;
    };
  };
}
