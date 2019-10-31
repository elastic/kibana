/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

function generateUUID(a) {
  // Taken from: https://gist.github.com/jed/982883
  return a
    ? (a ^ ((Math.random() * 16) >> (a / 4))).toString(16)
    : ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, generateUUID);
}

const generateIP = (() => {
  let counter = 1;
  return () => `172.31.0.${counter++}`;
})();


function generateEndpoint() {
  const ip = generateIP();
  const ipName = ip.replace(/\./g, '-');
  return {
    domain: 'InstallerInitiated',
    updated_at: '2019-09-25T16:20:59.147251+00:00',
    id: generateUUID(),
    display_operating_system: 'CentOS 7.3',
    hostname: `${ipName}.eng.endgames.local`,
    mac_address: '00:50:56:b1:57:fe',
    upgrade_status: '',
    base_image: false,
    isolation_updated_at: null,
    status: 'monitored',
    ad_distinguished_name: '',
    ad_hostname: '',
    tags: [],
    isolation_request_status: null,
    alert_count: 0,
    investigation_count: 0,
    groups: [],
    sensors: [
      {
        status: 'monitored',
        sensor_version: '3.52.10',
        policy_status: 'pending',
        policy_name: 'Default',
        sensor_type: 'hunt',
        id: generateUUID(),
        policy_id: 'f7b72190-bf79-4fb3-b509-1c9190177905',
      },
    ],
    ip_address: ip,
    is_isolated: false,
    operating_system: 'Linux 3.10.0-514.21.1.el7.x86_64',
    name: `adt-dhcp-${ipName}.eng.endgames.local`,
    status_changed_at: '2019-10-01T15:15:49.081945+00:00',
    core_os: 'linux',
    created_at: '2019-09-25T16:20:58.776960+00:00',
    error: null,
    machine_id: generateUUID(),
  };
}

const generateHostName = (function () {
  let counter = 1;
  return () => `azdqscou-${counter++}`;
}());


function generateHit() {
  const _id = generateUUID();
  const machineId = generateUUID();
  const ip = generateIP();
  const hostName = generateHostName();
  return {
    _index: 'endpoint',
    _type: '_doc',
    _id,
    _score: 1.0,
    _source: {
      machine_id: machineId,
      created_at: '2019-10-19T05:26:30.932442',
      host: {
        name: hostName,
        hostname: `${hostName}.elastic.co`,
        ip,
        mac_address: 'A3:13:E1:E4:02:5C',
        os: {
          name: 'Windows',
          full: 'Windows 95',
        },
      },
      endpoint: {
        domain: 'elastic.co',
        is_base_image: false,
        advertised_distinguished_name: `CN=${hostName},DC=elastic,DC=co`,
        advertised_hostname: `${hostName}.elastic.co`,
        upgrade: {
          status: null,
          updated_at: null,
        },
        isolation: {
          status: false,
          request_status: null,
          updated_at: null,
        },
        policy: {
          id: '28e9a553-69d1-41cc-abd1-6d8d88bc01f7',
        },
        sensor: {
          persistence: true,
          status: {},
        },
      },
    },
  };
}




export const endpoints = Array.from({ length: 50 }, () => generateEndpoint());

// Make it look like a response from elastic `_search` api
export const endpoints2 = {
  took: 1,
  timed_out: false,
  _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
  hits: {
    total: { value: 50, relation: 'eq' },
    max_score: 1.0,
    hits: Array.from({ length: 50 }, () => generateHit())
  }
};
