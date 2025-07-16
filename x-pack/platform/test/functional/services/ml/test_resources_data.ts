/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiscoverSessionAttributes } from '@kbn/saved-search-plugin/server';
import type { SavedObject } from '@kbn/core-saved-objects-common/src/server_types';

export const savedSearches: {
  [key: string]: {
    requestBody: Pick<SavedObject<DiscoverSessionAttributes>, 'attributes' | 'references'>;
  };
} = {
  farequoteFilter: {
    requestBody: {
      attributes: {
        title: 'ft_farequote_filter',
        description: '',
        tabs: [
          {
            id: 'tab_0',
            label: 'My Tab',
            attributes: {
              columns: ['_source'],
              sort: ['@timestamp', 'desc'],
              kibanaSavedObjectMeta: {
                searchSourceJSON: JSON.stringify({
                  highlightAll: true,
                  version: true,
                  query: {
                    query: '',
                    language: 'lucene',
                  },
                  filter: [
                    {
                      meta: {
                        index: 'INDEX_PATTERN_ID_PLACEHOLDER',
                        negate: false,
                        disabled: false,
                        alias: null,
                        type: 'phrase',
                        key: 'airline',
                        value: 'ASA',
                        params: {
                          query: 'ASA',
                          type: 'phrase',
                        },
                      },
                      query: {
                        match: {
                          airline: {
                            query: 'ASA',
                            type: 'phrase',
                          },
                        },
                      },
                      $state: {
                        store: 'appState',
                      },
                    },
                  ],
                  indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index',
                }),
              },
              grid: {},
              hideChart: false,
              isTextBasedQuery: false,
            },
          },
        ],
      },
      references: [
        {
          name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
          type: 'index-pattern',
          id: 'INDEX_PATTERN_ID_PLACEHOLDER',
        },
      ],
    },
  },
  farequoteLucene: {
    requestBody: {
      attributes: {
        title: 'ft_farequote_lucene',
        description: '',
        tabs: [
          {
            id: 'tab_0',
            label: 'My Tab',
            attributes: {
              columns: ['_source'],
              sort: ['@timestamp', 'desc'],
              kibanaSavedObjectMeta: {
                searchSourceJSON: JSON.stringify({
                  highlightAll: true,
                  version: true,
                  query: {
                    query: 'airline:A*',
                    language: 'lucene',
                  },
                  filter: [],
                  indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index',
                }),
              },
              grid: {},
              hideChart: false,
              isTextBasedQuery: false,
            },
          },
        ],
      },
      references: [
        {
          name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
          type: 'index-pattern',
          id: 'INDEX_PATTERN_ID_PLACEHOLDER',
        },
      ],
    },
  },
  farequoteKuery: {
    requestBody: {
      attributes: {
        title: 'ft_farequote_kuery',
        description: '',
        tabs: [
          {
            id: 'tab_0',
            label: 'My Tab',
            attributes: {
              columns: ['_source'],
              sort: ['@timestamp', 'desc'],
              kibanaSavedObjectMeta: {
                searchSourceJSON: JSON.stringify({
                  highlightAll: true,
                  version: true,
                  query: {
                    query: 'airline: A* and responsetime > 5',
                    language: 'kuery',
                  },
                  filter: [],
                  indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index',
                }),
              },
              grid: {},
              hideChart: false,
              isTextBasedQuery: false,
            },
          },
        ],
      },
      references: [
        {
          name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
          type: 'index-pattern',
          id: 'INDEX_PATTERN_ID_PLACEHOLDER',
        },
      ],
    },
  },
  farequoteFilterAndLucene: {
    requestBody: {
      attributes: {
        title: 'ft_farequote_filter_and_lucene',
        description: '',
        tabs: [
          {
            id: 'tab_0',
            label: 'My Tab',
            attributes: {
              columns: ['_source'],
              sort: ['@timestamp', 'desc'],
              kibanaSavedObjectMeta: {
                searchSourceJSON: JSON.stringify({
                  highlightAll: true,
                  version: true,
                  query: {
                    query: 'responsetime:>50',
                    language: 'lucene',
                  },
                  filter: [
                    {
                      meta: {
                        index: 'INDEX_PATTERN_ID_PLACEHOLDER',
                        negate: false,
                        disabled: false,
                        alias: null,
                        type: 'phrase',
                        key: 'airline',
                        value: 'ASA',
                        params: {
                          query: 'ASA',
                          type: 'phrase',
                        },
                      },
                      query: {
                        match: {
                          airline: {
                            query: 'ASA',
                            type: 'phrase',
                          },
                        },
                      },
                      $state: {
                        store: 'appState',
                      },
                    },
                  ],
                  indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index',
                }),
              },
              grid: {},
              hideChart: false,
              isTextBasedQuery: false,
            },
          },
        ],
      },
      references: [
        {
          name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
          type: 'index-pattern',
          id: 'INDEX_PATTERN_ID_PLACEHOLDER',
        },
      ],
    },
  },
  farequoteFilterAndKuery: {
    requestBody: {
      attributes: {
        title: 'ft_farequote_filter_and_kuery',
        description: '',
        tabs: [
          {
            id: 'tab_0',
            label: 'My Tab',
            attributes: {
              columns: ['_source'],
              sort: ['@timestamp', 'desc'],
              kibanaSavedObjectMeta: {
                searchSourceJSON: JSON.stringify({
                  highlightAll: true,
                  version: true,
                  query: {
                    query: 'responsetime > 49',
                    language: 'kuery',
                  },
                  filter: [
                    {
                      meta: {
                        index: 'INDEX_PATTERN_ID_PLACEHOLDER',
                        negate: false,
                        disabled: false,
                        alias: null,
                        type: 'phrase',
                        key: 'airline',
                        value: 'ASA',
                        params: {
                          query: 'ASA',
                          type: 'phrase',
                        },
                      },
                      query: {
                        match: {
                          airline: {
                            query: 'ASA',
                            type: 'phrase',
                          },
                        },
                      },
                      $state: {
                        store: 'appState',
                      },
                    },
                  ],
                  indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index',
                }),
              },
              grid: {},
              hideChart: false,
              isTextBasedQuery: false,
            },
          },
        ],
      },
      references: [
        {
          name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
          type: 'index-pattern',
          id: 'INDEX_PATTERN_ID_PLACEHOLDER',
        },
      ],
    },
  },
  farequoteFilterTwoAndLucene: {
    requestBody: {
      attributes: {
        title: 'ft_farequote_filter_two_and_lucene',
        description: '',
        tabs: [
          {
            id: 'tab_0',
            label: 'My Tab',
            attributes: {
              columns: ['_source'],
              sort: ['@timestamp', 'desc'],
              kibanaSavedObjectMeta: {
                searchSourceJSON: JSON.stringify({
                  highlightAll: true,
                  version: true,
                  query: {
                    query: 'responsetime:>50',
                    language: 'lucene',
                  },
                  filter: [
                    {
                      meta: {
                        index: 'INDEX_PATTERN_ID_PLACEHOLDER',
                        negate: false,
                        disabled: false,
                        alias: null,
                        type: 'phrases',
                        key: 'airline',
                        params: ['ASA', 'AAL'],
                      },
                      query: {
                        bool: {
                          should: [
                            {
                              match_phrase: {
                                airline: 'ASA',
                              },
                            },
                            {
                              match_phrase: {
                                airline: 'AAL',
                              },
                            },
                          ],
                          minimum_should_match: 1,
                        },
                      },
                      $state: {
                        store: 'appState',
                      },
                    },
                  ],
                  indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index',
                }),
              },
              grid: {},
              hideChart: false,
              isTextBasedQuery: false,
            },
          },
        ],
      },
      references: [
        {
          name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
          type: 'index-pattern',
          id: 'INDEX_PATTERN_ID_PLACEHOLDER',
        },
      ],
    },
  },
  farequoteFilterTwoAndKuery: {
    requestBody: {
      attributes: {
        title: 'ft_farequote_filter_two_and_kuery',
        description: '',
        tabs: [
          {
            id: 'tab_0',
            label: 'My Tab',
            attributes: {
              columns: ['_source'],
              sort: ['@timestamp', 'desc'],
              kibanaSavedObjectMeta: {
                searchSourceJSON: JSON.stringify({
                  highlightAll: true,
                  version: true,
                  query: {
                    query: 'responsetime > 49',
                    language: 'kuery',
                  },
                  filter: [
                    {
                      meta: {
                        index: 'INDEX_PATTERN_ID_PLACEHOLDER',
                        negate: false,
                        disabled: false,
                        alias: null,
                        type: 'phrases',
                        key: 'airline',
                        params: ['ASA', 'FFT'],
                      },
                      query: {
                        bool: {
                          should: [
                            {
                              match_phrase: {
                                airline: 'ASA',
                              },
                            },
                            {
                              match_phrase: {
                                airline: 'FFT',
                              },
                            },
                          ],
                          minimum_should_match: 1,
                        },
                      },
                      $state: {
                        store: 'appState',
                      },
                    },
                  ],
                  indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index',
                }),
              },
              grid: {},
              hideChart: false,
              isTextBasedQuery: false,
            },
          },
        ],
      },
      references: [
        {
          name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
          type: 'index-pattern',
          id: 'INDEX_PATTERN_ID_PLACEHOLDER',
        },
      ],
    },
  },
};

export const dashboards = {
  mlTestDashboard: {
    requestBody: {
      attributes: {
        title: 'ML Test',
        hits: 0,
        description: '',
        panelsJSON: '[]',
        optionsJSON: '{"hidePanelTitles":false,"useMargins":true}',
        version: 1,
        timeRestore: false,
        kibanaSavedObjectMeta: {
          searchSourceJSON: '{"query":{"language":"kuery","query":""},"filter":[]}',
        },
      },
    },
  },
};
