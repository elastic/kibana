/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { sampleDocNoSortIdNoVersion } from './__mocks__/es_results';
import { getThresholdSignalQueryFields } from './bulk_create_threshold_signals';

describe('getThresholdSignalQueryFields', () => {
  it('should return proper fields for match_phrase filters', () => {
    const mockHit = {
      ...sampleDocNoSortIdNoVersion(),
      _source: {
        '@timestamp': '2020-11-03T02:31:47.431Z',
        event: {
          dataset: 'traefik.access',
          module: 'traefik',
        },
        traefik: {
          access: {
            entryPointName: 'web-secure',
          },
        },
        url: {
          domain: 'kibana.siem.estc.dev',
        },
      },
    };
    const mockFilters = {
      bool: {
        must: [],
        filter: [
          {
            bool: {
              filter: [
                {
                  bool: {
                    should: [
                      {
                        match_phrase: {
                          'event.module': 'traefik',
                        },
                      },
                    ],
                    minimum_should_match: 1,
                  },
                },
                {
                  bool: {
                    filter: [
                      {
                        bool: {
                          should: [
                            {
                              match_phrase: {
                                'event.dataset': 'traefik.access',
                              },
                            },
                          ],
                          minimum_should_match: 1,
                        },
                      },
                      {
                        bool: {
                          should: [
                            {
                              match_phrase: {
                                'traefik.access.entryPointName': 'web-secure',
                              },
                            },
                          ],
                          minimum_should_match: 1,
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
          {
            match_phrase: {
              'url.domain': 'kibana.siem.estc.dev',
            },
          },
        ],
        should: [],
        must_not: [],
      },
    };

    expect(getThresholdSignalQueryFields(mockHit, mockFilters)).toEqual({
      'event.dataset': 'traefik.access',
      'event.module': 'traefik',
      'traefik.access.entryPointName': 'web-secure',
      'url.domain': 'kibana.siem.estc.dev',
    });
  });

  it('should return proper fields object for nested match filters', () => {
    const mockHit = {
      ...sampleDocNoSortIdNoVersion(),
      _source: {
        '@timestamp': '2020-11-03T02:31:47.431Z',
        event: {
          dataset: 'traefik.access',
          module: 'traefik',
        },
        url: {
          domain: 'kibana.siem.estc.dev',
        },
      },
    };
    const filters = {
      bool: {
        must: [],
        filter: [
          {
            bool: {
              filter: [
                {
                  bool: {
                    should: [
                      {
                        match_phrase: {
                          'event.module': 'traefik',
                        },
                      },
                    ],
                    minimum_should_match: 1,
                  },
                },
                {
                  bool: {
                    should: [
                      {
                        match: {
                          'event.dataset': 'traefik.*',
                        },
                      },
                    ],
                    minimum_should_match: 1,
                  },
                },
              ],
            },
          },
        ],
        should: [],
        must_not: [],
      },
    };

    expect(getThresholdSignalQueryFields(mockHit, filters)).toEqual({
      'event.dataset': 'traefik.access',
      'event.module': 'traefik',
    });
  });

  it('should return proper object for simple match filters', () => {
    const mockHit = {
      ...sampleDocNoSortIdNoVersion(),
      _source: {
        '@timestamp': '2020-11-03T02:31:47.431Z',
        event: {
          dataset: 'traefik.access',
          module: 'traefik',
        },
      },
    };
    const filters = {
      bool: {
        must: [],
        filter: [
          {
            bool: {
              should: [
                {
                  match: {
                    'event.module': 'traefik',
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
          {
            match_phrase: {
              'event.dataset': 'traefik.access',
            },
          },
        ],
        should: [],
        must_not: [],
      },
    };

    expect(getThresholdSignalQueryFields(mockHit, filters)).toEqual({
      'event.dataset': 'traefik.access',
      'event.module': 'traefik',
    });
  });

  it('should return proper object for simple match_phrase filters', () => {
    const mockHit = {
      ...sampleDocNoSortIdNoVersion(),
      _source: {
        '@timestamp': '2020-11-03T02:31:47.431Z',
        event: {
          dataset: 'traefik.access',
          module: 'traefik',
        },
      },
    };
    const filters = {
      bool: {
        must: [],
        filter: [
          {
            bool: {
              should: [
                {
                  match_phrase: {
                    'event.module': 'traefik',
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
          {
            match_phrase: {
              'event.dataset': 'traefik.access',
            },
          },
        ],
        should: [],
        must_not: [],
      },
    };

    expect(getThresholdSignalQueryFields(mockHit, filters)).toEqual({
      'event.module': 'traefik',
      'event.dataset': 'traefik.access',
    });
  });

  it('should return proper object for exists filters', () => {
    const mockHit = {
      ...sampleDocNoSortIdNoVersion(),
      _source: {
        '@timestamp': '2020-11-03T02:31:47.431Z',
        event: {
          module: 'traefik',
        },
      },
    };
    const filters = {
      bool: {
        should: [
          {
            bool: {
              should: [
                {
                  exists: {
                    field: 'process.name',
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
          {
            bool: {
              should: [
                {
                  exists: {
                    field: 'event.type',
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
        ],
        minimum_should_match: 1,
      },
    };
    expect(getThresholdSignalQueryFields(mockHit, filters)).toEqual({});
  });

  it('should NOT add invalid characters from CIDR such as the "/" proper object for simple match_phrase filters', () => {
    const mockHit = {
      ...sampleDocNoSortIdNoVersion(),
      _source: {
        '@timestamp': '2020-11-03T02:31:47.431Z',
        destination: {
          ip: '192.168.0.16',
        },
        event: {
          module: 'traefik',
        },
      },
    };
    const filters = {
      bool: {
        must: [],
        filter: [
          {
            bool: {
              should: [
                {
                  match: {
                    'destination.ip': '192.168.0.0/16',
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
        ],
        should: [],
        must_not: [],
      },
    };

    expect(getThresholdSignalQueryFields(mockHit, filters)).toEqual({
      'destination.ip': '192.168.0.16',
    });
  });
});
