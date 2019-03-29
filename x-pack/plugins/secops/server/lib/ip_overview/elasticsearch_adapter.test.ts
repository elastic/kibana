/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IpOverviewType } from '../../graphql/types';

import { getIpOverviewAgg } from './elasticsearch_adapter';

describe('elasticsearch_adapter', () => {
  describe('#getHosts', () => {
    const responseAggs = {
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
                    _index: 'filebeat-8.0.0-2019.03.21-000002',
                    _type: '_doc',
                    _id: 'u35Py2kBCQofM5eXerHN',
                    _score: null,
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
          ip_count: {
            value: 882307,
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
          ip_count: {
            value: 1002234,
          },
        },
      },
    };

    const formattedDestination = {
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

    const formattedSource = {
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

    const formattedEmptySource = {
      source: {
        firstSeen: null,
        lastSeen: null,
        autonomousSystem: {},
        host: {},
        geo: {},
      },
    };

    test('will return a destination correctly', () => {
      // @ts-ignore
      const destination = getIpOverviewAgg(IpOverviewType.destination, responseAggs);
      expect(destination).toEqual(formattedDestination);
    });

    test('will return a source correctly', () => {
      // @ts-ignore
      const destination = getIpOverviewAgg(IpOverviewType.source, responseAggs);
      expect(destination).toEqual(formattedSource);
    });

    test('will return an empty source correctly', () => {
      // @ts-ignore
      const destination = getIpOverviewAgg(IpOverviewType.source, {});
      expect(destination).toEqual(formattedEmptySource);
    });
  });
});
