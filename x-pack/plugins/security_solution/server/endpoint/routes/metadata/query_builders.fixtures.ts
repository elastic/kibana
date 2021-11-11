/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export const expectedCompleteUnitedIndexQuery = {
  bool: {
    must: [
      {
        bool: {
          must_not: {
            terms: {
              'agent.id': [
                '00000000-0000-0000-0000-000000000000',
                '11111111-1111-1111-1111-111111111111',
              ],
            },
          },
          filter: [
            {
              terms: {
                'united.agent.policy_id': ['test-endpoint-policy-id'],
              },
            },
            {
              exists: {
                field: 'united.endpoint.agent.id',
              },
            },
            {
              exists: {
                field: 'united.agent.agent.id',
              },
            },
            {
              term: {
                'united.agent.active': {
                  value: true,
                },
              },
            },
          ],
        },
      },
      {
        bool: {
          filter: [
            {
              bool: {
                must_not: {
                  bool: {
                    filter: [
                      {
                        bool: {
                          should: [
                            {
                              range: {
                                'united.agent.last_checkin': {
                                  lt: 'now-120s',
                                },
                              },
                            },
                          ],
                          minimum_should_match: 1,
                        },
                      },
                      {
                        bool: {
                          must_not: {
                            bool: {
                              filter: [
                                {
                                  bool: {
                                    should: [
                                      {
                                        bool: {
                                          should: [
                                            {
                                              match: {
                                                'united.agent.last_checkin_status': 'error',
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
                                                'united.agent.last_checkin_status': 'degraded',
                                              },
                                            },
                                          ],
                                          minimum_should_match: 1,
                                        },
                                      },
                                    ],
                                    minimum_should_match: 1,
                                  },
                                },
                                {
                                  bool: {
                                    must_not: {
                                      bool: {
                                        should: [
                                          {
                                            bool: {
                                              filter: [
                                                {
                                                  bool: {
                                                    should: [
                                                      {
                                                        exists: {
                                                          field: 'united.agent.upgrade_started_at',
                                                        },
                                                      },
                                                    ],
                                                    minimum_should_match: 1,
                                                  },
                                                },
                                                {
                                                  bool: {
                                                    must_not: {
                                                      bool: {
                                                        should: [
                                                          {
                                                            exists: {
                                                              field: 'united.agent.upgraded_at',
                                                            },
                                                          },
                                                        ],
                                                        minimum_should_match: 1,
                                                      },
                                                    },
                                                  },
                                                },
                                              ],
                                            },
                                          },
                                          {
                                            bool: {
                                              must_not: {
                                                bool: {
                                                  should: [
                                                    {
                                                      exists: {
                                                        field: 'united.agent.last_checkin',
                                                      },
                                                    },
                                                  ],
                                                  minimum_should_match: 1,
                                                },
                                              },
                                            },
                                          },
                                          {
                                            bool: {
                                              should: [
                                                {
                                                  exists: {
                                                    field: 'united.agent.unenrollment_started_at',
                                                  },
                                                },
                                              ],
                                              minimum_should_match: 1,
                                            },
                                          },
                                        ],
                                        minimum_should_match: 1,
                                      },
                                    },
                                  },
                                },
                              ],
                            },
                          },
                        },
                      },
                      {
                        bool: {
                          must_not: {
                            bool: {
                              should: [
                                {
                                  bool: {
                                    filter: [
                                      {
                                        bool: {
                                          should: [
                                            {
                                              exists: {
                                                field: 'united.agent.upgrade_started_at',
                                              },
                                            },
                                          ],
                                          minimum_should_match: 1,
                                        },
                                      },
                                      {
                                        bool: {
                                          must_not: {
                                            bool: {
                                              should: [
                                                {
                                                  exists: {
                                                    field: 'united.agent.upgraded_at',
                                                  },
                                                },
                                              ],
                                              minimum_should_match: 1,
                                            },
                                          },
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  bool: {
                                    must_not: {
                                      bool: {
                                        should: [
                                          {
                                            exists: {
                                              field: 'united.agent.last_checkin',
                                            },
                                          },
                                        ],
                                        minimum_should_match: 1,
                                      },
                                    },
                                  },
                                },
                                {
                                  bool: {
                                    should: [
                                      {
                                        exists: {
                                          field: 'united.agent.unenrollment_started_at',
                                        },
                                      },
                                    ],
                                    minimum_should_match: 1,
                                  },
                                },
                              ],
                              minimum_should_match: 1,
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            {
              bool: {
                must_not: {
                  bool: {
                    filter: [
                      {
                        bool: {
                          should: [
                            {
                              bool: {
                                should: [
                                  {
                                    match: {
                                      'united.agent.last_checkin_status': 'error',
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
                                      'united.agent.last_checkin_status': 'degraded',
                                    },
                                  },
                                ],
                                minimum_should_match: 1,
                              },
                            },
                          ],
                          minimum_should_match: 1,
                        },
                      },
                      {
                        bool: {
                          must_not: {
                            bool: {
                              should: [
                                {
                                  bool: {
                                    filter: [
                                      {
                                        bool: {
                                          should: [
                                            {
                                              exists: {
                                                field: 'united.agent.upgrade_started_at',
                                              },
                                            },
                                          ],
                                          minimum_should_match: 1,
                                        },
                                      },
                                      {
                                        bool: {
                                          must_not: {
                                            bool: {
                                              should: [
                                                {
                                                  exists: {
                                                    field: 'united.agent.upgraded_at',
                                                  },
                                                },
                                              ],
                                              minimum_should_match: 1,
                                            },
                                          },
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  bool: {
                                    must_not: {
                                      bool: {
                                        should: [
                                          {
                                            exists: {
                                              field: 'united.agent.last_checkin',
                                            },
                                          },
                                        ],
                                        minimum_should_match: 1,
                                      },
                                    },
                                  },
                                },
                                {
                                  bool: {
                                    should: [
                                      {
                                        exists: {
                                          field: 'united.agent.unenrollment_started_at',
                                        },
                                      },
                                    ],
                                    minimum_should_match: 1,
                                  },
                                },
                              ],
                              minimum_should_match: 1,
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            {
              bool: {
                must_not: {
                  bool: {
                    should: [
                      {
                        bool: {
                          filter: [
                            {
                              bool: {
                                should: [
                                  {
                                    exists: {
                                      field: 'united.agent.upgrade_started_at',
                                    },
                                  },
                                ],
                                minimum_should_match: 1,
                              },
                            },
                            {
                              bool: {
                                must_not: {
                                  bool: {
                                    should: [
                                      {
                                        exists: {
                                          field: 'united.agent.upgraded_at',
                                        },
                                      },
                                    ],
                                    minimum_should_match: 1,
                                  },
                                },
                              },
                            },
                          ],
                        },
                      },
                      {
                        bool: {
                          must_not: {
                            bool: {
                              should: [
                                {
                                  exists: {
                                    field: 'united.agent.last_checkin',
                                  },
                                },
                              ],
                              minimum_should_match: 1,
                            },
                          },
                        },
                      },
                      {
                        bool: {
                          should: [
                            {
                              exists: {
                                field: 'united.agent.unenrollment_started_at',
                              },
                            },
                          ],
                          minimum_should_match: 1,
                        },
                      },
                    ],
                    minimum_should_match: 1,
                  },
                },
              },
            },
          ],
        },
      },
      {
        bool: {
          should: [
            {
              exists: {
                field: 'united.endpoint.host.os.name',
              },
            },
          ],
          minimum_should_match: 1,
        },
      },
    ],
  },
};
