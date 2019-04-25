/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DomainsEdges, NetworkDirectionEcs, UsersEdges } from '../../graphql/types';

import { DomainsBuckets, IpOverviewHit, UsersResponse } from './types';

export const responseAggs: IpOverviewHit = {
  aggregations: {
    destination: {
      doc_count: 882307,
      geo: {
        doc_count: 62089,
        results: {
          hits: {
            total: {
              value: 62089,
              relation: 'eq',
            },
            max_score: null,
            hits: [
              {
                _source: {
                  destination: {
                    geo: {
                      continent_name: 'Asia',
                      region_iso_code: 'IN-KA',
                      city_name: 'Bengaluru',
                      country_iso_code: 'IN',
                      region_name: 'Karnataka',
                      location: {
                        lon: 77.5833,
                        lat: 12.9833,
                      },
                    },
                  },
                },
                sort: [1553894176003],
              },
            ],
          },
        },
      },
      lastSeen: {
        value: 1553900180003,
        value_as_string: '2019-03-29T22:56:20.003Z',
      },
      firstSeen: {
        value: 1551388820000,
        value_as_string: '2019-02-28T21:20:20.000Z',
      },
      host: {
        doc_count: 882307,
        results: {
          hits: {
            total: {
              value: 882307,
              relation: 'eq',
            },
            max_score: null,
            hits: [
              {
                _index: 'packetbeat-8.0.0-2019.02.19-000001',
                _type: '_doc',
                _id: 'vX5Py2kBCQofM5eX2OEu',
                _score: null,
                _source: {
                  host: {
                    hostname: 'suricata-bangalore',
                    os: {
                      kernel: '4.15.0-45-generic',
                      codename: 'bionic',
                      name: 'Ubuntu',
                      family: 'debian',
                      version: '18.04.2 LTS (Bionic Beaver)',
                      platform: 'ubuntu',
                    },
                    containerized: false,
                    ip: ['139.59.11.147', '10.47.0.5', 'fe80::ec0b:1bff:fe29:80bd'],
                    name: 'suricata-bangalore',
                    id: '0a63559c1acf4c419d979c4b4d8b83ff',
                    mac: ['ee:0b:1b:29:80:bd'],
                    architecture: 'x86_64',
                  },
                },
                sort: [1553894200003],
              },
            ],
          },
        },
      },
      autonomous_system: {
        doc_count: 0,
        results: {
          hits: {
            total: {
              value: 0,
              relation: 'eq',
            },
            max_score: null,
            hits: [],
          },
        },
      },
    },
    source: {
      doc_count: 1002234,
      geo: {
        doc_count: 1507,
        results: {
          hits: {
            total: {
              value: 1507,
              relation: 'eq',
            },
            max_score: null,
            hits: [
              {
                _index: 'filebeat-8.0.0-2019.03.21-000002',
                _type: '_doc',
                _id: 'dHQ6y2kBCQofM5eXi5OE',
                _score: null,
                _source: {
                  source: {
                    geo: {
                      continent_name: 'Asia',
                      region_iso_code: 'IN-KA',
                      city_name: 'Bengaluru',
                      country_iso_code: 'IN',
                      region_name: 'Karnataka',
                      location: {
                        lon: 77.5833,
                        lat: 12.9833,
                      },
                    },
                  },
                },
                sort: [1553892804003],
              },
            ],
          },
        },
      },
      lastSeen: {
        value: 1553900180003,
        value_as_string: '2019-03-29T22:56:20.003Z',
      },
      firstSeen: {
        value: 1551388804322,
        value_as_string: '2019-02-28T21:20:04.322Z',
      },
      host: {
        doc_count: 1002234,
        results: {
          hits: {
            total: {
              value: 1002234,
              relation: 'eq',
            },
            max_score: null,
            hits: [
              {
                _index: 'packetbeat-8.0.0-2019.02.19-000001',
                _type: '_doc',
                _id: 'vn5Py2kBCQofM5eX2OEu',
                _score: null,
                _source: {
                  host: {
                    hostname: 'suricata-bangalore',
                    os: {
                      kernel: '4.15.0-45-generic',
                      codename: 'bionic',
                      name: 'Ubuntu',
                      family: 'debian',
                      version: '18.04.2 LTS (Bionic Beaver)',
                      platform: 'ubuntu',
                    },
                    ip: ['139.59.11.147', '10.47.0.5', 'fe80::ec0b:1bff:fe29:80bd'],
                    containerized: false,
                    name: 'suricata-bangalore',
                    id: '0a63559c1acf4c419d979c4b4d8b83ff',
                    mac: ['ee:0b:1b:29:80:bd'],
                    architecture: 'x86_64',
                  },
                },
                sort: [1553894200003],
              },
            ],
          },
        },
      },
      autonomous_system: {
        doc_count: 0,
        results: {
          hits: {
            total: {
              value: 0,
              relation: 'eq',
            },
            max_score: null,
            hits: [],
          },
        },
      },
    },
  },
  _shards: {
    total: 42,
    successful: 42,
    skipped: 0,
    failed: 0,
  },
  hits: {
    total: {
      value: 71358841,
      relation: 'eq',
    },
    max_score: null,
    hits: [],
  },
  took: 392,
  timeout: 500,
};

export const formattedDestination = {
  destination: {
    firstSeen: '2019-02-28T21:20:20.000Z',
    lastSeen: '2019-03-29T22:56:20.003Z',
    autonomousSystem: {},
    host: {
      hostname: 'suricata-bangalore',
      os: {
        kernel: '4.15.0-45-generic',
        codename: 'bionic',
        name: 'Ubuntu',
        family: 'debian',
        version: '18.04.2 LTS (Bionic Beaver)',
        platform: 'ubuntu',
      },
      containerized: false,
      ip: ['139.59.11.147', '10.47.0.5', 'fe80::ec0b:1bff:fe29:80bd'],
      name: 'suricata-bangalore',
      id: '0a63559c1acf4c419d979c4b4d8b83ff',
      mac: ['ee:0b:1b:29:80:bd'],
      architecture: 'x86_64',
    },
    geo: {
      continent_name: 'Asia',
      region_iso_code: 'IN-KA',
      city_name: 'Bengaluru',
      country_iso_code: 'IN',
      region_name: 'Karnataka',
      location: {
        lon: 77.5833,
        lat: 12.9833,
      },
    },
  },
};

export const formattedSource = {
  source: {
    firstSeen: '2019-02-28T21:20:04.322Z',
    lastSeen: '2019-03-29T22:56:20.003Z',
    autonomousSystem: {},
    host: {
      hostname: 'suricata-bangalore',
      os: {
        kernel: '4.15.0-45-generic',
        codename: 'bionic',
        name: 'Ubuntu',
        family: 'debian',
        version: '18.04.2 LTS (Bionic Beaver)',
        platform: 'ubuntu',
      },
      containerized: false,
      ip: ['139.59.11.147', '10.47.0.5', 'fe80::ec0b:1bff:fe29:80bd'],
      name: 'suricata-bangalore',
      id: '0a63559c1acf4c419d979c4b4d8b83ff',
      mac: ['ee:0b:1b:29:80:bd'],
      architecture: 'x86_64',
    },
    geo: {
      continent_name: 'Asia',
      region_iso_code: 'IN-KA',
      city_name: 'Bengaluru',
      country_iso_code: 'IN',
      region_name: 'Karnataka',
      location: {
        lon: 77.5833,
        lat: 12.9833,
      },
    },
  },
};

export const formattedEmptySource = {
  source: {
    firstSeen: null,
    lastSeen: null,
    autonomousSystem: {},
    host: {},
    geo: {},
  },
};

export const mockDomainsResponseBuckets: DomainsBuckets[] = [
  {
    key: 'example.com',
    uniqueIpCount: {
      value: 805,
    },
    lastSeen: {
      value: 1554920919000,
      value_as_string: '2019-04-10T18:28:39.000Z',
    },
    bytes: {
      value: 974964465,
    },
    firstSeen: {
      value: 1554146873000,
      value_as_string: '2019-04-01T19:27:53.000Z',
    },
    packets: {
      value: 16946245,
    },
    direction: {
      buckets: [
        {
          key: NetworkDirectionEcs.outbound,
          doc_count: 51668,
        },
        {
          key: NetworkDirectionEcs.inbound,
          doc_count: 25681,
        },
      ],
    },
  },
];

export const mockFormattedSource: DomainsEdges[] = [
  {
    cursor: { tiebreaker: null, value: 'example.com' },
    node: {
      _id: 'example.com',
      network: {
        bytes: 974964465,
        direction: [NetworkDirectionEcs.outbound, NetworkDirectionEcs.inbound],
        packets: 16946245,
      },
      source: {
        domainName: 'example.com',
        firstSeen: '2019-04-01T19:27:53.000Z',
        lastSeen: '2019-04-10T18:28:39.000Z',
        uniqueIpCount: 805,
      },
    },
  },
];

export const mockFormattedDestination: DomainsEdges[] = [
  {
    cursor: { tiebreaker: null, value: 'example.com' },
    node: {
      _id: 'example.com',
      destination: {
        domainName: 'example.com',
        firstSeen: '2019-04-01T19:27:53.000Z',
        lastSeen: '2019-04-10T18:28:39.000Z',
        uniqueIpCount: 805,
      },
      network: {
        bytes: 974964465,
        direction: [NetworkDirectionEcs.outbound, NetworkDirectionEcs.inbound],
        packets: 16946245,
      },
    },
  },
];

export const mockUsersData: UsersResponse = {
  took: 445,
  timed_out: false,
  _shards: {
    total: 59,
    successful: 59,
    skipped: 0,
    failed: 0,
  },
  hits: {
    max_score: null,
    hits: [],
  },
  aggregations: {
    user_count: {
      value: 3,
    },
    users: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: '_apt',
          doc_count: 10,
          groupName: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'nogroup',
                doc_count: 10,
              },
            ],
          },
          groupId: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: '65534',
                doc_count: 10,
              },
            ],
          },
          id: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: '104',
                doc_count: 10,
              },
            ],
          },
        },
        {
          key: 'root',
          doc_count: 109,
          groupName: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'Debian-exim',
                doc_count: 72,
              },
              {
                key: 'root',
                doc_count: 37,
              },
            ],
          },
          groupId: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: '116',
                doc_count: 72,
              },
              {
                key: '0',
                doc_count: 37,
              },
            ],
          },
          id: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: '0',
                doc_count: 109,
              },
            ],
          },
        },
        {
          key: 'systemd-resolve',
          doc_count: 4,
          groupName: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
          groupId: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
          id: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: '102',
                doc_count: 4,
              },
            ],
          },
        },
      ],
    },
  },
};

export const mockFormattedUsersEdges: UsersEdges[] = [
  {
    node: {
      _id: '_apt',
      user: {
        id: ['104'],
        name: '_apt',
        groupId: ['65534'],
        groupName: ['nogroup'],
        count: 10,
      },
    },
    cursor: {
      value: '_apt',
      tiebreaker: null,
    },
  },
  {
    node: {
      _id: 'root',
      user: {
        id: ['0'],
        name: 'root',
        groupId: ['116', '0'],
        groupName: ['Debian-exim', 'root'],
        count: 109,
      },
    },
    cursor: {
      value: 'root',
      tiebreaker: null,
    },
  },
  {
    node: {
      _id: 'systemd-resolve',
      user: {
        id: ['102'],
        name: 'systemd-resolve',
        groupId: [],
        groupName: [],
        count: 4,
      },
    },
    cursor: {
      value: 'systemd-resolve',
      tiebreaker: null,
    },
  },
];
