/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
export interface EndpointData {
  machine_id: string;
  created_at: Date;
  host: {
    name: string;
    hostname: string;
    ip: string;
    macAddress: string;
    os: {
      name: string;
      full: string;
    };
  };
  endpoint: {
    domain: string;
    is_base_image: boolean;
    active_directory_distinguishedName: string;
    active_directory_hostname: string;
    upgrade: {
      status?: string;
      updated_at?: Date;
    };
    isolation: {
      status: false;
      request_status?: string | boolean;
      updated_at?: date;
    };
    policy: {
      name: string;
      id: string;
    };
    sensor: {
      persistence: true;
      status: object;
    };
  };
}
