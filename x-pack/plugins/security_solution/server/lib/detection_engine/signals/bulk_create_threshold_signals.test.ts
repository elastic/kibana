/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getThresholdSignalQueryFields } from './bulk_create_threshold_signals';

describe('getThresholdSignalQueryFields', () => {
  it('should return proper fields for match_phrase filters', () => {
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

    expect(getThresholdSignalQueryFields(mockFilters)).toEqual({
      'event.module': 'traefik',
      'event.dataset': 'traefik.access',
      'traefik.access.entryPointName': 'web-secure',
      'url.domain': 'kibana.siem.estc.dev',
    });
  });

  it('should return proper fields object for nested match filters', () => {
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
                          'event.dataset': 'traefik.access',
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

    expect(getThresholdSignalQueryFields(filters)).toEqual({
      'event.module': 'traefik',
      'event.dataset': 'traefik.access',
    });
  });

  it('should return proper object for simple match filters', () => {
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

    expect(getThresholdSignalQueryFields(filters)).toEqual({
      'event.module': 'traefik',
      'event.dataset': 'traefik.access',
    });
  });

  it('should return proper object for simple match_phrase filters', () => {
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

    expect(getThresholdSignalQueryFields(filters)).toEqual({
      'event.module': 'traefik',
      'event.dataset': 'traefik.access',
    });
  });
});
