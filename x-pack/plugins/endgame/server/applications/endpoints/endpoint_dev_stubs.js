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

export const endpoints = Array.from({ length: 50 }, () => generateEndpoint());

// const endgame_api_response = {
//   data: [
//     {
//       domain: 'InstallerInitiated',
//       updated_at: '2019-09-25T16:20:59.147251+00:00',
//       id: '63aacf27-246e-4323-afda-5c1803e994b7',
//       display_operating_system: 'CentOS 7.3',
//       hostname: 'adt-dhcp-172-31-4-178.eng.endgames.local',
//       mac_address: '00:50:56:b1:57:fe',
//       upgrade_status: '',
//       base_image: false,
//       isolation_updated_at: null,
//       status: 'monitored',
//       ad_distinguished_name: '',
//       ad_hostname: '',
//       tags: [],
//       isolation_request_status: null,
//       alert_count: 0,
//       investigation_count: 0,
//       groups: [],
//       sensors: [
//         {
//           status: 'monitored',
//           sensor_version: '3.52.10',
//           policy_status: 'pending',
//           policy_name: 'Default',
//           sensor_type: 'hunt',
//           id: '89222ebe-0436-5cdc-b49c-171c5ce1a939',
//           policy_id: 'f7b72190-bf79-4fb3-b509-1c9190177905',
//         },
//       ],
//       ip_address: '10.6.217.55',
//       is_isolated: false,
//       operating_system: 'Linux 3.10.0-514.21.1.el7.x86_64',
//       name: 'adt-dhcp-172-31-4-178.eng.endgames.local',
//       status_changed_at: '2019-10-01T15:15:49.081945+00:00',
//       core_os: 'linux',
//       created_at: '2019-09-25T16:20:58.776960+00:00',
//       error: null,
//       machine_id: 'b581dbe2-af02-581f-0b3c-0f90e45c455d',
//     },
//     {
//       domain: '.',
//       updated_at: '2019-10-01T16:21:14.866643+00:00',
//       id: 'ee7569d5-60cd-4416-8740-0a3ffa5d103f',
//       display_operating_system: 'Windows 10 (v1803)',
//       hostname: 'DESKTOP-QBBSCUT',
//       mac_address: '00:50:56:b1:61:1e',
//       upgrade_status: '',
//       base_image: false,
//       isolation_updated_at: null,
//       status: 'monitored',
//       ad_distinguished_name: '',
//       ad_hostname: '',
//       tags: [],
//       isolation_request_status: null,
//       alert_count: 0,
//       investigation_count: 0,
//       groups: [],
//       sensors: [
//         {
//           status: 'monitored',
//           sensor_version: '3.52.10',
//           policy_status: 'pending',
//           policy_name: 'ME-ME-ME',
//           sensor_type: 'hunt',
//           id: '89dcadc0-de09-5bfb-bd88-7ebc5cf19bd6',
//           policy_id: '486d7658-3e2c-42b3-b0e4-1a99cc7744a3',
//         },
//       ],
//       ip_address: '10.6.179.210',
//       is_isolated: false,
//       operating_system: 'Windows 10.0 ',
//       name: 'DESKTOP-QBBSCUT',
//       status_changed_at: '2019-10-01T15:15:44.080439+00:00',
//       core_os: 'windows',
//       created_at: '2019-09-25T16:19:54.124273+00:00',
//       error: null,
//       machine_id: '7220d25c-7581-7dd0-fe55-451515631c8b',
//     },
//   ],
//   metadata: {
//     count: 2,
//     previous_url: null,
//     timestamp: '2019-10-15T16:22:51.334619',
//     next: null,
//     per_page: 50,
//     next_url: null,
//     transaction_id: '921c7142-50de-4131-9fe1-e4fa4fc54748',
//     previous: null,
//   },
// };
