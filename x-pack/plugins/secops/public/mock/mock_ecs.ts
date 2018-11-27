/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ECS } from '../../components/timeline/ecs';

export const mockECSData: ECS[] = [
  {
    _id: '1',
    timestamp: '2018-11-05T19:03:25.937Z',
    host: {
      hostname: 'apache',
      ip: '192.168.0.1',
    },
    event: {
      id: '1',
      category: 'Access',
      type: 'HTTP Request',
      module: 'nginx',
      severity: 3,
    },
    source: {
      ip: '192.168.0.1',
      port: 80,
    },
    destination: {
      ip: '192.168.0.3',
      port: 6343,
    },
    user: {
      id: '1',
      name: 'john.dee',
    },
    geo: {
      region_name: 'xx',
      country_iso_code: 'xx',
    },
  },
  {
    _id: '3',
    timestamp: '2018-11-07T19:03:25.937Z',
    host: {
      hostname: 'nginx',
      ip: '192.168.0.1',
    },
    event: {
      id: '3',
      category: 'Access',
      type: 'HTTP Request',
      module: 'nginx',
      severity: 1,
    },
    source: {
      ip: '192.168.0.3',
      port: 443,
    },
    destination: {
      ip: '192.168.0.3',
      port: 6343,
    },
    user: {
      id: '3',
      name: 'evan.davis',
    },
    geo: {
      region_name: 'xx',
      country_iso_code: 'xx',
    },
  },
  {
    _id: '4',
    timestamp: '2018-11-08T19:03:25.937Z',
    host: {
      hostname: 'suricata',
      ip: '192.168.0.1',
    },
    event: {
      id: '4',
      category: 'Attempted Administrator Privilege Gain',
      type: 'Alert',
      module: 'suricata',
      severity: 1,
    },
    source: {
      ip: '192.168.0.3',
      port: 53,
    },
    destination: {
      ip: '192.168.0.3',
      port: 6343,
    },
    suricata: {
      eve: {
        flow_id: 4,
        proto: '',
        alert: {
          signature: 'ET EXPLOIT NETGEAR WNR2000v5 hidden_lang_avi Stack Overflow (CVE-2016-10174)',
          signature_id: 4,
        },
      },
    },
    user: {
      id: '4',
      name: 'jenny.jones',
    },
    geo: {
      region_name: 'xx',
      country_iso_code: 'xx',
    },
  },
  {
    _id: '5',
    timestamp: '2018-11-09T19:03:25.937Z',
    host: {
      hostname: 'joe.computer',
      ip: '192.168.0.1',
    },
    event: {
      id: '5',
      category: 'Access',
      type: 'HTTP Request',
      module: 'nginx',
      severity: 3,
    },
    source: {
      ip: '192.168.0.3',
      port: 80,
    },
    destination: {
      ip: '192.168.0.3',
      port: 6343,
    },
    user: {
      id: '5',
      name: 'becky.davis',
    },
    geo: {
      region_name: 'xx',
      country_iso_code: 'xx',
    },
  },
  {
    _id: '6',
    timestamp: '2018-11-10T19:03:25.937Z',
    host: {
      hostname: 'braden.davis',
      ip: '192.168.0.1',
    },
    event: {
      id: '6',
      category: 'Access',
      type: 'HTTP Request',
      module: 'nginx',
      severity: 3,
    },
    source: {
      ip: '192.168.0.6',
      port: 80,
    },
    destination: {
      ip: '192.168.0.3',
      port: 6343,
    },
    geo: {
      region_name: 'xx',
      country_iso_code: 'xx',
    },
  },
  {
    _id: '8',
    timestamp: '2018-11-12T19:03:25.937Z',
    host: {
      hostname: 'joe.computer',
      ip: '192.168.0.1',
    },
    event: {
      id: '8',
      category: 'Web Application Attack',
      type: 'Alert',
      module: 'suricata',
      severity: 2,
    },
    suricata: {
      eve: {
        flow_id: 8,
        proto: '',
        alert: {
          signature: 'ET WEB_SERVER Possible CVE-2014-6271 Attempt in HTTP Cookie',
          signature_id: 8,
        },
      },
    },
    source: {
      ip: '192.168.0.8',
      port: 80,
    },
    destination: {
      ip: '192.168.0.3',
      port: 6343,
    },
    user: {
      id: '8',
      name: 'jone.doe',
    },
    geo: {
      region_name: 'xx',
      country_iso_code: 'xx',
    },
  },
  {
    _id: '7',
    timestamp: '2018-11-11T19:03:25.937Z',
    host: {
      hostname: 'joe.computer',
      ip: '192.168.0.1',
    },
    event: {
      id: '7',
      category: 'Access',
      type: 'HTTP Request',
      module: 'apache',
      severity: 3,
    },
    source: {
      ip: '192.168.0.7',
      port: 80,
    },
    destination: {
      ip: '192.168.0.3',
      port: 6343,
    },
    user: {
      id: '7',
      name: 'jone.doe',
    },
    geo: {
      region_name: 'xx',
      country_iso_code: 'xx',
    },
  },
  {
    _id: '9',
    timestamp: '2018-11-13T19:03:25.937Z',
    host: {
      hostname: 'joe.computer',
      ip: '192.168.0.1',
    },
    event: {
      id: '9',
      category: 'Access',
      type: 'HTTP Request',
      module: 'nginx',
      severity: 3,
    },
    source: {
      ip: '192.168.0.9',
      port: 80,
    },
    destination: {
      ip: '192.168.0.3',
      port: 6343,
    },
    user: {
      id: '9',
      name: 'jone.doe',
    },
    geo: {
      region_name: 'xx',
      country_iso_code: 'xx',
    },
  },
  {
    _id: '10',
    timestamp: '2018-11-14T19:03:25.937Z',
    host: {
      hostname: 'joe.computer',
      ip: '192.168.0.1',
    },
    event: {
      id: '10',
      category: 'Access',
      type: 'HTTP Request',
      module: 'nginx',
      severity: 3,
    },
    source: {
      ip: '192.168.0.10',
      port: 80,
    },
    destination: {
      ip: '192.168.0.3',
      port: 6343,
    },
    user: {
      id: '10',
      name: 'jone.doe',
    },
    geo: {
      region_name: 'xx',
      country_iso_code: 'xx',
    },
  },
  {
    _id: '11',
    timestamp: '2018-11-15T19:03:25.937Z',
    host: {
      hostname: 'joe.computer',
      ip: '192.168.0.1',
    },
    event: {
      id: '11',
      category: 'Access',
      type: 'HTTP Request',
      module: 'nginx',
      severity: 3,
    },
    source: {
      ip: '192.168.0.11',
      port: 80,
    },
    destination: {
      ip: '192.168.0.3',
      port: 6343,
    },
    user: {
      id: '11',
      name: 'jone.doe',
    },
    geo: {
      region_name: 'xx',
      country_iso_code: 'xx',
    },
  },
  {
    _id: '12',
    timestamp: '2018-11-16T19:03:25.937Z',
    host: {
      hostname: 'joe.computer',
      ip: '192.168.0.1',
    },
    event: {
      id: '12',
      category: 'Access',
      type: 'HTTP Request',
      module: 'nginx',
      severity: 3,
    },
    source: {
      ip: '192.168.0.12',
      port: 80,
    },
    destination: {
      ip: '192.168.0.3',
      port: 6343,
    },
    user: {
      id: '12',
      name: 'jone.doe',
    },
    geo: {
      region_name: 'xx',
      country_iso_code: 'xx',
    },
  },
  {
    _id: '2',
    timestamp: '2018-11-06T19:03:25.937Z',
    host: {
      hostname: 'joe.computer',
      ip: '192.168.0.1',
    },
    event: {
      id: '2',
      category: 'Authentication',
      type: 'Authentication Success',
      module: 'authlog',
      severity: 3,
    },
    source: {
      ip: '192.168.0.2',
      port: 80,
    },
    destination: {
      ip: '192.168.0.3',
      port: 6343,
    },
    user: {
      id: '1',
      name: 'joe.bob',
    },
    geo: {
      region_name: 'xx',
      country_iso_code: 'xx',
    },
  },
  {
    _id: '13',
    timestamp: '2018-13-12T19:03:25.937Z',
    host: {
      hostname: 'joe.computer',
      ip: '192.168.0.1',
    },
    event: {
      id: '13',
      category: 'Web Application Attack',
      type: 'Alert',
      module: 'suricata',
      severity: 1,
    },
    suricata: {
      eve: {
        flow_id: 13,
        proto: '',
        alert: {
          signature: 'ET WEB_SERVER Possible Attempt in HTTP Cookie',
          signature_id: 13,
        },
      },
    },
    source: {
      ip: '192.168.0.8',
      port: 80,
    },
    destination: {
      ip: '192.168.0.3',
      port: 6343,
    },
    geo: {
      region_name: 'xx',
      country_iso_code: 'xx',
    },
  },
];
