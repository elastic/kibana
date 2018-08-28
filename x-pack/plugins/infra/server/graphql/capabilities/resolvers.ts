/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* tslint:disable: no-console */

export const createCapabilitiesResolvers = () => ({
  InfraSource: {
    capabilitiesByNode(source: any, args: any, { req }: any) {
      console.log('source: ', source);
      console.log('args: ', args);
      return [
        { name: 'mysql.status', source: 'metrics' },
        { name: 'system.memory', source: 'metrics' },
        { name: 'system.process', source: 'metrics' },
        { name: 'system.cpu', source: 'metrics' },
        { name: 'system.diskio', source: 'metrics' },
        { name: 'system.fsstat', source: 'metrics' },
        { name: 'system.load', source: 'metrics' },
        { name: 'system.network', source: 'metrics' },
        { name: 'system.process_summary', source: 'metrics' },
        { name: 'system.auth', source: 'logs' },
        { name: 'system.syslog', source: 'logs' },
        { name: 'mysql.error', source: 'logs' },
      ];
    },
  },
});
