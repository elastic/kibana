/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isSpaceAwarenessEnabled } from './helpers';
import { addNamespaceFilteringToQuery } from './query_namespaces_filtering';

jest.mock('./helpers');

describe('addNamespaceFilteringToQuery', () => {
  const baseActionQuery = {
    bool: {
      must_not: [
        {
          term: {
            type: 'CANCEL',
          },
        },
      ],
    },
  };

  const baseActionQueryWithFilter = {
    bool: {
      must_not: [
        {
          term: {
            type: 'CANCEL',
          },
        },
      ],
      filter: [
        {
          range: {
            '@timestamp': {
              gte: 'now-3600s/s',
              lte: 'now/s',
            },
          },
        },
      ],
    },
  };

  const basePolicyQuery = {
    bool: {
      filter: [
        {
          range: {
            revision_idx: {
              gt: 1,
            },
          },
        },
        {
          term: {
            coordinator_idx: 0,
          },
        },
      ],
    },
  };

  describe('with isSpaceAwarenessEnabled returning false', () => {
    beforeEach(() => {
      jest.mocked(isSpaceAwarenessEnabled).mockResolvedValue(false);
    });

    it('should return the same query', async () => {
      expect(await addNamespaceFilteringToQuery(baseActionQuery, 'mySpace')).toEqual(
        baseActionQuery
      );
    });
  });

  describe('with isSpaceAwarenessEnabled returning true', () => {
    beforeEach(() => {
      jest.mocked(isSpaceAwarenessEnabled).mockResolvedValue(true);
    });

    it('should return the same query if the current namespace is undefined', async () => {
      expect(await addNamespaceFilteringToQuery(baseActionQuery)).toEqual(baseActionQuery);
    });

    it('should add a filter to the base action query in a custom space', async () => {
      expect(await addNamespaceFilteringToQuery(baseActionQuery, 'mySpace')).toEqual({
        bool: {
          must_not: [
            {
              term: {
                type: 'CANCEL',
              },
            },
          ],
          filter: [
            {
              terms: {
                namespaces: ['mySpace'],
              },
            },
          ],
        },
      });
    });

    it('should add a filter to the base action query in a custom space if there is already filtering', async () => {
      expect(await addNamespaceFilteringToQuery(baseActionQueryWithFilter, 'mySpace')).toEqual({
        bool: {
          must_not: [
            {
              term: {
                type: 'CANCEL',
              },
            },
          ],
          filter: [
            {
              range: {
                '@timestamp': {
                  gte: 'now-3600s/s',
                  lte: 'now/s',
                },
              },
            },
            {
              terms: {
                namespaces: ['mySpace'],
              },
            },
          ],
        },
      });
    });

    it('should add a filter to the base policy query in a custom space', async () => {
      expect(await addNamespaceFilteringToQuery(basePolicyQuery, 'mySpace')).toEqual({
        bool: {
          filter: [
            {
              range: {
                revision_idx: {
                  gt: 1,
                },
              },
            },
            {
              term: {
                coordinator_idx: 0,
              },
            },
            {
              terms: {
                namespaces: ['mySpace'],
              },
            },
          ],
        },
      });
    });

    it('should add a filter to the base action query in the default space', async () => {
      expect(await addNamespaceFilteringToQuery(baseActionQuery, 'default')).toEqual({
        bool: {
          must_not: [
            {
              term: {
                type: 'CANCEL',
              },
            },
          ],
          filter: [
            {
              bool: {
                should: [
                  {
                    terms: {
                      namespaces: ['default'],
                    },
                  },
                  {
                    bool: {
                      must_not: [
                        {
                          exists: {
                            field: 'namespaces',
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      });
    });

    it('should add a filter to the base action query in the default space if there is already filtering', async () => {
      expect(await addNamespaceFilteringToQuery(baseActionQueryWithFilter, 'default')).toEqual({
        bool: {
          must_not: [
            {
              term: {
                type: 'CANCEL',
              },
            },
          ],
          filter: [
            {
              range: {
                '@timestamp': {
                  gte: 'now-3600s/s',
                  lte: 'now/s',
                },
              },
            },
            {
              bool: {
                should: [
                  {
                    terms: {
                      namespaces: ['default'],
                    },
                  },
                  {
                    bool: {
                      must_not: [
                        {
                          exists: {
                            field: 'namespaces',
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      });
    });

    it('should add a filter to the base policy query in the default space', async () => {
      expect(await addNamespaceFilteringToQuery(basePolicyQuery, 'default')).toEqual({
        bool: {
          filter: [
            {
              range: {
                revision_idx: {
                  gt: 1,
                },
              },
            },
            {
              term: {
                coordinator_idx: 0,
              },
            },
            {
              bool: {
                should: [
                  {
                    terms: {
                      namespaces: ['default'],
                    },
                  },
                  {
                    bool: {
                      must_not: [
                        {
                          exists: {
                            field: 'namespaces',
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      });
    });
  });
});
