/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ECS } from '../../components/timeline/ecs';

export const mockECSData: ECS[] = [
  {
    _id: '1',
    '@timestamp': '2018-11-05T19:03:25.937Z',
    event: {
      id: '1',
      category: 'Access',
      type: 'HTTP Request',
      module: 'nginx',
      severity: 3,
    },
    source: {
      ip: '192.168.0.1',
      hostname: 'web.server',
    },
    user: {
      id: '1',
      name: 'john.dee',
    },
  },
  {
    _id: '2',
    '@timestamp': '2018-11-06T19:03:25.937Z',
    event: {
      id: '2',
      category: 'Authentication',
      type: 'Authentication Success',
      module: 'authlog',
      severity: 3,
    },
    source: {
      ip: '192.168.0.2',
      hostname: 'joe.computer',
    },
    user: {
      id: '1',
      name: 'joe.bob',
    },
  },
  {
    _id: '3',
    '@timestamp': '2018-11-07T19:03:25.937Z',
    event: {
      id: '3',
      category: 'Access',
      type: 'HTTP Request',
      module: 'nginx',
      severity: 1,
    },
    source: {
      ip: '192.168.0.3',
      hostname: 'nginx',
    },
    user: {
      id: '3',
      name: 'matt.micheal',
    },
  },
  {
    _id: '4',
    '@timestamp': '2018-11-08T19:03:25.937Z',
    event: {
      id: '4',
      category: 'Malware',
      type: 'alert',
      module: 'suricata',
      severity: 1,
    },
    source: {
      ip: '192.168.0.3',
      hostname: 'suricata',
    },
    user: {
      id: '4',
      name: 'jenny.jones',
    },
  },
  {
    _id: '5',
    '@timestamp': '2018-11-09T19:03:25.937Z',
    event: {
      id: '5',
      category: 'Access',
      type: 'HTTP Request',
      module: 'nginx',
      severity: 3,
    },
    source: {
      ip: '192.168.0.3',
      hostname: 'joe.computer',
    },
    user: {
      id: '5',
      name: 'becky.davis',
    },
  },
  {
    _id: '6',
    '@timestamp': '2018-11-10T19:03:25.937Z',
    event: {
      id: '6',
      category: 'Access',
      type: 'HTTP Request',
      module: 'nginx',
      severity: 3,
    },
    source: {
      ip: '192.168.0.6',
      hostname: 'joe.computer',
    },
    user: {
      id: '6',
      name: 'john.doe',
    },
  },
  {
    _id: '7',
    '@timestamp': '2018-11-11T19:03:25.937Z',
    event: {
      id: '7',
      category: 'Access',
      type: 'HTTP Request',
      module: 'apache',
      severity: 3,
    },
    source: {
      ip: '192.168.0.7',
      hostname: 'joe.computer',
    },
    user: {
      id: '7',
      name: 'jone.doe',
    },
  },
  {
    _id: '8',
    '@timestamp': '2018-11-12T19:03:25.937Z',
    event: {
      id: '8',
      category: 'Access',
      type: 'SQL Access',
      module: 'msql',
      severity: 3,
    },
    source: {
      ip: '192.168.0.8',
      hostname: 'joe.computer',
    },
    user: {
      id: '8',
      name: 'jone.doe',
    },
  },
  {
    _id: '9',
    '@timestamp': '2018-11-13T19:03:25.937Z',
    event: {
      id: '9',
      category: 'Access',
      type: 'HTTP Request',
      module: 'nginx',
      severity: 3,
    },
    source: {
      ip: '192.168.0.9',
      hostname: 'joe.computer',
    },
    user: {
      id: '9',
      name: 'jone.doe',
    },
  },
  {
    _id: '10',
    '@timestamp': '2018-11-14T19:03:25.937Z',
    event: {
      id: '10',
      category: 'Access',
      type: 'HTTP Request',
      module: 'nginx',
      severity: 3,
    },
    source: {
      ip: '192.168.0.10',
      hostname: 'joe.computer',
    },
    user: {
      id: '10',
      name: 'jone.doe',
    },
  },
  {
    _id: '11',
    '@timestamp': '2018-11-15T19:03:25.937Z',
    event: {
      id: '11',
      category: 'Access',
      type: 'HTTP Request',
      module: 'nginx',
      severity: 3,
    },
    source: {
      ip: '192.168.0.11',
      hostname: 'joe.computer',
    },
    user: {
      id: '11',
      name: 'jone.doe',
    },
  },
  {
    _id: '12',
    '@timestamp': '2018-11-16T19:03:25.937Z',
    event: {
      id: '12',
      category: 'Access',
      type: 'HTTP Request',
      module: 'nginx',
      severity: 3,
    },
    source: {
      ip: '192.168.0.12',
      hostname: 'joe.computer',
    },
    user: {
      id: '12',
      name: 'jone.doe',
    },
  },
];
