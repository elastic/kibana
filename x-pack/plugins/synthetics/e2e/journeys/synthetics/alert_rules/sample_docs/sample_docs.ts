/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';

export const firstUpHit = {
  summary: {
    up: 1,
    down: 0,
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
    name: 'Test Monitor',
    timespan: {
      lt: '2022-12-18T09:55:04.211Z',
      gte: '2022-12-18T09:52:04.211Z',
    },
    fleet_managed: true,
    id: 'b9d9e146-746f-427f-bbf5-6e786b5b4e73',
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
  observer: {
    geo: {
      name: 'Test private location',
    },
    name: 'Test private location',
  },
  '@timestamp': '2022-12-18T09:52:04.056Z',
  ecs: {
    version: '8.0.0',
  },
  config_id: 'b9d9e146-746f-427f-bbf5-6e786b5b4e73',
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
};

export const firstDownHit = ({
  name,
  timestamp,
  monitorId,
}: { timestamp?: string; monitorId?: string; name?: string } = {}) => ({
  summary: {
    up: 0,
    down: 1,
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
  observer: {
    geo: {
      name: 'Test private location',
    },
    name: 'Test private location',
  },
  '@timestamp': timestamp ?? '2022-12-18T09:49:49.976Z',
  ecs: {
    version: '8.0.0',
  },
  config_id: monitorId ?? 'b9d9e146-746f-427f-bbf5-6e786b5b4e73',
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
});

const sampleHits = {
  took: 1,
  timed_out: false,
  _shards: {
    total: 1,
    successful: 1,
    skipped: 0,
    failed: 0,
  },
  hits: {
    total: {
      value: 3,
      relation: 'eq',
    },
    max_score: null,
    hits: [
      firstUpHit,
      {
        _index: '.ds-synthetics-http-default-2022.12.18-000001',
        _id: 'TfCjJIUB1hhCUz-n3bWY',
        _score: null,
        _ignored: ['http.response.body.content'],
        _source: firstDownHit,
        sort: [1671356989976],
      },
      {
        _index: '.ds-synthetics-http-default-2022.12.18-000001',
        _id: 'fPCiJIUB1hhCUz-nVbMK',
        _score: null,
        _source: {
          summary: {
            up: 1,
            down: 0,
          },
          tcp: {
            rtt: {
              connect: {
                us: 26843,
              },
            },
          },
          agent: {
            name: 'docker-fleet-server',
            id: 'dd39a87d-a1e5-45a1-8dd9-e78d6a1391c6',
            ephemeral_id: '264bb432-93f6-4aa6-a14d-266c53b9e7c7',
            type: 'heartbeat',
            version: '8.7.0',
          },
          resolve: {
            rtt: {
              us: 18153,
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
              us: 179022,
            },
            ip: '142.250.181.196',
            origin: 'ui',
            name: 'Test Monitor',
            id: 'b9d9e146-746f-427f-bbf5-6e786b5b4e73',
            timespan: {
              lt: '2022-12-18T09:51:09.403Z',
              gte: '2022-12-18T09:48:09.403Z',
            },
            check_group: '144186b2-7eb9-11ed-8949-0242ac120006',
            fleet_managed: true,
            type: 'http',
            status: 'up',
          },
          url: {
            scheme: 'https',
            port: 443,
            domain: 'www.google.com',
            full: 'https://www.google.com',
          },
          observer: {
            geo: {
              name: 'Test private location',
            },
            name: 'Test private location',
          },
          '@timestamp': '2022-12-18T09:48:09.224Z',
          ecs: {
            version: '8.0.0',
          },
          config_id: 'b9d9e146-746f-427f-bbf5-6e786b5b4e73',
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
                us: 34230,
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
            started_at: '2022-12-18T09:48:15.335017193Z',
            id: 'Test private location-18524a25067-0',
            up: 1,
            down: 0,
            flap_history: [],
            status: 'up',
          },
          event: {
            agent_id_status: 'verified',
            ingested: '2022-12-18T09:48:16Z',
            dataset: 'http',
          },
        },
        sort: [1671356889224],
      },
    ],
  },
};
