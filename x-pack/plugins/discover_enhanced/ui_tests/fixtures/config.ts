/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ServersConfig {
  servers: {
    kibana: {
      protocol: 'http' | 'https';
      hostname: string;
      port: number;
      username: string;
      password: string;
    };
    elasticsearch: {
      protocol: 'http' | 'https';
      hostname: string;
      port: number;
      username: string;
      password: string;
    };
  };
}

export const serversConfig: ServersConfig = {
  servers: {
    kibana: {
      protocol: 'http',
      hostname: 'localhost',
      port: 5620,
      username: 'elastic',
      password: 'changeme',
    },
    elasticsearch: {
      protocol: 'http',
      hostname: 'localhost',
      port: 9220,
      username: 'elastic',
      password: 'changeme',
    },
  },
};
