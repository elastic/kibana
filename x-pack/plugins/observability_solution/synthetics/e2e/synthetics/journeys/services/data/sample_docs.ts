/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { getGeoData } from './browser_docs';

export interface DocOverrides {
  timestamp?: string;
  monitorId?: string;
  name?: string;
  testRunId?: string;
  locationName?: string;
  configId?: string;
}

export const getUpHit = ({
  name,
  timestamp,
  monitorId,
  configId,
  testRunId,
  locationName,
}: DocOverrides = {}) => ({
  ...getGeoData(locationName),
  summary: {
    up: 1,
    down: 0,
    final_attempt: true,
  },
  tcp: {
    rtt: {
      connect: {
        us: 22245,
      },
    },
  },
  agent: {
    name: 'docker-fleet-server',
    id: 'dd39a87d-a1e5-45a1-8dd9-e78d6a1391c6',
    type: 'heartbeat',
    ephemeral_id: '264bb432-93f6-4aa6-a14d-266c53b9e7c7',
    version: '8.7.0',
  },
  resolve: {
    rtt: {
      us: 3101,
    },
    ip: '142.250.181.196',
  },
  elastic_agent: {
    id: 'dd39a87d-a1e5-45a1-8dd9-e78d6a1391c6',
    version: '8.7.0',
    snapshot: true,
  },
  monitor: {
    duration: {
      us: 155239,
    },
    ip: '142.250.181.196',
    origin: 'ui',
    name: name ?? 'Test Monitor',
    timespan: {
      lt: '2022-12-18T09:55:04.211Z',
      gte: '2022-12-18T09:52:04.211Z',
    },
    fleet_managed: true,
    id: monitorId ?? 'b9d9e146-746f-427f-bbf5-6e786b5b4e73',
    check_group: 'a039fd21-7eb9-11ed-8949-0242ac120006',
    type: 'http',
    status: 'up',
  },
  url: {
    scheme: 'https',
    port: 443,
    domain: 'www.google.com',
    full: 'https://www.google.com',
  },
  '@timestamp': timestamp ?? '2022-12-18T09:52:04.056Z',
  ecs: {
    version: '8.0.0',
  },
  config_id: configId ?? 'b9d9e146-746f-427f-bbf5-6e786b5b4e73',
  data_stream: {
    namespace: 'default',
    type: 'synthetics',
    dataset: 'http',
  },
  tls: {
    cipher: 'TLS-AES-128-GCM-SHA256',
    certificate_not_valid_before: '2022-11-28T08:19:01.000Z',
    established: true,
    server: {
      x509: {
        not_after: '2023-02-20T08:19:00.000Z',
        subject: {
          distinguished_name: 'CN=www.google.com',
          common_name: 'www.google.com',
        },
        not_before: '2022-11-28T08:19:01.000Z',
        public_key_curve: 'P-256',
        public_key_algorithm: 'ECDSA',
        signature_algorithm: 'SHA256-RSA',
        serial_number: '173037077033925240295268439311466214245',
        issuer: {
          distinguished_name: 'CN=GTS CA 1C3,O=Google Trust Services LLC,C=US',
          common_name: 'GTS CA 1C3',
        },
      },
      hash: {
        sha1: 'ea1b44061b864526c45619230b3299117d11bf4e',
        sha256: 'a5686448de09cc82b9cdad1e96357f919552ab14244da7948dd412ec0fc37d2b',
      },
    },
    rtt: {
      handshake: {
        us: 35023,
      },
    },
    version: '1.3',
    certificate_not_valid_after: '2023-02-20T08:19:00.000Z',
    version_protocol: 'tls',
  },
  state: {
    duration_ms: 0,
    checks: 1,
    ends: null,
    started_at: '2022-12-18T09:52:10.30502451Z',
    up: 1,
    id: 'Test private location-18524a5e641-0',
    down: 0,
    flap_history: [],
    status: 'up',
  },
  event: {
    agent_id_status: 'verified',
    ingested: '2022-12-18T09:52:11Z',
    dataset: 'http',
  },
  ...(testRunId && { test_run_id: testRunId }),
  http: {
    rtt: {
      response_header: {
        us: 144758,
      },
      total: {
        us: 149191,
      },
      write_request: {
        us: 48,
      },
      content: {
        us: 401,
      },
      validate: {
        us: 145160,
      },
    },
    response: {
      headers: {
        Server: 'gws',
        P3p: 'CP="This is not a P3P policy! See g.co/p3phelp for more info."',
        Date: 'Thu, 29 Dec 2022 08:17:09 GMT',
        'X-Frame-Options': 'SAMEORIGIN',
        'Accept-Ranges': 'none',
        'Cache-Control': 'private, max-age=0',
        'X-Xss-Protection': '0',
        'Cross-Origin-Opener-Policy-Report-Only': 'same-origin-allow-popups; report-to="gws"',
        Vary: 'Accept-Encoding',
        Expires: '-1',
        'Content-Type': 'text/html; charset=ISO-8859-1',
      },
      status_code: 200,
      mime_type: 'text/html; charset=utf-8',
      body: {
        bytes: 13963,
        hash: 'a4c2cf7dead9fb9329fc3727fc152b6a12072410926430491d02a0c6dc3a70ff',
      },
    },
  },
});

export const firstDownHit = ({
  name,
  timestamp,
  monitorId,
  locationName,
  configId,
}: DocOverrides = {}) => ({
  ...getGeoData(locationName),
  summary: {
    up: 0,
    down: 1,
    final_attempt: true,
  },
  tcp: {
    rtt: {
      connect: {
        us: 20482,
      },
    },
  },
  agent: {
    name: 'docker-fleet-server',
    id: 'dd39a87d-a1e5-45a1-8dd9-e78d6a1391c6',
    type: 'heartbeat',
    ephemeral_id: '264bb432-93f6-4aa6-a14d-266c53b9e7c7',
    version: '8.7.0',
  },
  resolve: {
    rtt: {
      us: 3234,
    },
    ip: '142.250.181.196',
  },
  elastic_agent: {
    id: 'dd39a87d-a1e5-45a1-8dd9-e78d6a1391c6',
    version: '8.7.0',
    snapshot: true,
  },
  monitor: {
    duration: {
      us: 152459,
    },
    origin: 'ui',
    ip: '142.250.181.196',
    name: name ?? 'Test Monitor',
    fleet_managed: true,
    check_group: uuidv4(),
    timespan: {
      lt: '2022-12-18T09:52:50.128Z',
      gte: '2022-12-18T09:49:50.128Z',
    },
    id: monitorId ?? 'b9d9e146-746f-427f-bbf5-6e786b5b4e73',
    type: 'http',
    status: 'down',
  },
  error: {
    message: 'received status code 200 expecting [500]',
    type: 'validate',
  },
  url: {
    scheme: 'https',
    port: 443,
    domain: 'www.google.com',
    full: 'https://www.google.com',
  },
  '@timestamp': timestamp ?? '2022-12-18T09:49:49.976Z',
  ecs: {
    version: '8.0.0',
  },
  config_id: configId ?? 'b9d9e146-746f-427f-bbf5-6e786b5b4e73',
  data_stream: {
    namespace: 'default',
    type: 'synthetics',
    dataset: 'http',
  },
  tls: {
    established: true,
    cipher: 'TLS-AES-128-GCM-SHA256',
    certificate_not_valid_before: '2022-11-28T08:19:01.000Z',
    server: {
      x509: {
        not_after: '2023-02-20T08:19:00.000Z',
        subject: {
          distinguished_name: 'CN=www.google.com',
          common_name: 'www.google.com',
        },
        not_before: '2022-11-28T08:19:01.000Z',
        public_key_algorithm: 'ECDSA',
        public_key_curve: 'P-256',
        signature_algorithm: 'SHA256-RSA',
        serial_number: '173037077033925240295268439311466214245',
        issuer: {
          distinguished_name: 'CN=GTS CA 1C3,O=Google Trust Services LLC,C=US',
          common_name: 'GTS CA 1C3',
        },
      },
      hash: {
        sha1: 'ea1b44061b864526c45619230b3299117d11bf4e',
        sha256: 'a5686448de09cc82b9cdad1e96357f919552ab14244da7948dd412ec0fc37d2b',
      },
    },
    rtt: {
      handshake: {
        us: 28468,
      },
    },
    version: '1.3',
    certificate_not_valid_after: '2023-02-20T08:19:00.000Z',
    version_protocol: 'tls',
  },
  state: {
    duration_ms: 0,
    checks: 1,
    ends: null,
    started_at: '2022-12-18T09:49:56.007551998Z',
    id: 'Test private location-18524a3d9a7-0',
    up: 0,
    down: 1,
    flap_history: [],
    status: 'down',
  },
  event: {
    agent_id_status: 'verified',
    ingested: '2022-12-18T09:49:57Z',
    dataset: 'http',
  },
  http: {
    rtt: {
      response_header: {
        us: 144758,
      },
      total: {
        us: 149191,
      },
      write_request: {
        us: 48,
      },
      content: {
        us: 401,
      },
      validate: {
        us: 145160,
      },
    },
    response: {
      headers: {
        Server: 'gws',
        P3p: 'CP="This is not a P3P policy! See g.co/p3phelp for more info."',
        Date: 'Thu, 29 Dec 2022 08:17:09 GMT',
        'X-Frame-Options': 'SAMEORIGIN',
        'Accept-Ranges': 'none',
        'Cache-Control': 'private, max-age=0',
        'X-Xss-Protection': '0',
        'Cross-Origin-Opener-Policy-Report-Only': 'same-origin-allow-popups; report-to="gws"',
        Vary: 'Accept-Encoding',
        Expires: '-1',
        'Content-Type': 'text/html; charset=ISO-8859-1',
      },
      status_code: 200,
      mime_type: 'text/html; charset=utf-8',
      body: {
        bytes: 13963,
        hash: 'a4c2cf7dead9fb9329fc3727fc152b6a12072410926430491d02a0c6dc3a70ff',
      },
    },
  },
});
