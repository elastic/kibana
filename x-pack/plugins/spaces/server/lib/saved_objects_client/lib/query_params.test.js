/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getSpacesQueryParams } from './query_params';

test('returns no parameters when no types are provided', () => {
  expect(getSpacesQueryParams('space_1', [])).toEqual({});
});

test('creates a query that filters on type, but not on space, for types that are not space-aware', () => {
  const spaceId = 'space_1';
  const type = 'space';

  const expectedTypeClause = {
    bool: {
      must: [{
        term: {
          type
        }
      }]
    }
  };
  expect(getSpacesQueryParams(spaceId, [type])).toEqual({
    bool: {
      should: [expectedTypeClause],
      minimum_should_match: 1
    }
  });
});

test('creates a query that restricts a space-aware type to the provided space (space_1)', () => {
  const spaceId = 'space_1';
  const type = 'dashboard';

  const expectedTypeClause = {
    bool: {
      must: [{
        term: {
          type
        }
      }, {
        term: {
          spaceId
        }
      }]
    }
  };

  expect(getSpacesQueryParams(spaceId, [type])).toEqual({
    bool: {
      should: [expectedTypeClause],
      minimum_should_match: 1
    }
  });
});

test('creates a query that restricts a space-aware type to the provided space (default)', () => {
  const spaceId = 'default';
  const type = 'dashboard';

  const expectedTypeClause = {
    bool: {
      must: [{
        term: {
          type
        }
      }],
      // The default space does not add its spaceId to the objects that belong to it, in order
      // to be compatible with installations that are not always space-aware.
      must_not: [{
        exists: {
          field: 'spaceId'
        }
      }]
    }
  };

  expect(getSpacesQueryParams(spaceId, [type])).toEqual({
    bool: {
      should: [expectedTypeClause],
      minimum_should_match: 1
    }
  });
});

test('creates a query supporting a find operation on multiple types', () => {
  const spaceId = 'space_1';
  const types = [
    'dashboard',
    'space',
    'visualization',
  ];

  const expectedSpaceClause = {
    term: {
      spaceId
    }
  };

  const expectedTypeClauses = [{
    bool: {
      must: [{
        term: {
          type: 'dashboard'
        }
      }, expectedSpaceClause]
    }
  }, {
    bool: {
      must: [{
        term: {
          type: 'space'
        }
      }]
    }
  }, {
    bool: {
      must: [{
        term: {
          type: 'visualization'
        }
      }, expectedSpaceClause]
    }
  }];

  expect(getSpacesQueryParams(spaceId, types)).toEqual({
    bool: {
      should: expectedTypeClauses,
      minimum_should_match: 1
    }
  });
});
