/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  addCombinedFieldsToMappings,
  addCombinedFieldsToPipeline,
  createGeoPointCombinedField,
  isWithinLatRange,
  isWithinLonRange,
  removeCombinedFieldsFromMappings,
  removeCombinedFieldsFromPipeline,
} from './utils';

const combinedFields = [createGeoPointCombinedField('lat', 'lon', 'location')];

test('addCombinedFieldsToMappings', () => {
  const mappings = {
    _meta: {
      created_by: '',
    },
    properties: {
      lat: {
        type: 'number',
      },
      lon: {
        type: 'number',
      },
    },
  };
  expect(addCombinedFieldsToMappings(mappings, combinedFields)).toEqual({
    _meta: {
      created_by: '',
    },
    properties: {
      lat: {
        type: 'number',
      },
      lon: {
        type: 'number',
      },
      location: {
        type: 'geo_point',
      },
    },
  });
});

test('removeCombinedFieldsFromMappings', () => {
  const mappings = {
    _meta: {
      created_by: '',
    },
    properties: {
      lat: {
        type: 'number',
      },
      lon: {
        type: 'number',
      },
      location: {
        type: 'geo_point',
      },
    },
  };
  expect(removeCombinedFieldsFromMappings(mappings, combinedFields)).toEqual({
    _meta: {
      created_by: '',
    },
    properties: {
      lat: {
        type: 'number',
      },
      lon: {
        type: 'number',
      },
    },
  });
});

test('addCombinedFieldsToPipeline', () => {
  const pipeline = {
    description: '',
    processors: [
      {
        set: {
          field: 'anotherfield',
          value: '{{value}}',
        },
      },
    ],
  };
  expect(addCombinedFieldsToPipeline(pipeline, combinedFields)).toEqual({
    description: '',
    processors: [
      {
        set: {
          field: 'anotherfield',
          value: '{{value}}',
        },
      },
      {
        set: {
          field: 'location',
          value: '{{lat}},{{lon}}',
        },
      },
    ],
  });
});

test('removeCombinedFieldsFromPipeline', () => {
  const pipeline = {
    description: '',
    processors: [
      {
        set: {
          field: 'anotherfield',
          value: '{{value}}',
        },
      },
      {
        set: {
          field: 'location',
          value: '{{lat}},{{lon}}',
        },
      },
    ],
  };
  expect(removeCombinedFieldsFromPipeline(pipeline, combinedFields)).toEqual({
    description: '',
    processors: [
      {
        set: {
          field: 'anotherfield',
          value: '{{value}}',
        },
      },
    ],
  });
});

test('isWithinLatRange', () => {
  expect(isWithinLatRange('fieldAlpha', {})).toBe(false);
  expect(
    isWithinLatRange('fieldAlpha', {
      fieldAlpha: {
        count: 1,
        cardinality: 1,
        top_hits: [{ count: 1, value: 1 }],
      },
    })
  ).toBe(false);
  expect(
    isWithinLatRange('fieldAlpha', {
      fieldAlpha: {
        count: 1,
        cardinality: 1,
        top_hits: [{ count: 1, value: 100 }],
        max_value: 100,
        min_value: 0,
      },
    })
  ).toBe(false);
  expect(
    isWithinLatRange('fieldAlpha', {
      fieldAlpha: {
        count: 1,
        cardinality: 1,
        top_hits: [{ count: 1, value: -100 }],
        max_value: 0,
        min_value: -100,
      },
    })
  ).toBe(false);
  expect(
    isWithinLatRange('fieldAlpha', {
      fieldAlpha: {
        count: 1,
        cardinality: 1,
        top_hits: [{ count: 1, value: 0 }],
        max_value: 0,
        min_value: 0,
      },
    })
  ).toBe(true);
});

test('isWithinLonRange', () => {
  expect(isWithinLonRange('fieldAlpha', {})).toBe(false);
  expect(
    isWithinLonRange('fieldAlpha', {
      fieldAlpha: {
        count: 1,
        cardinality: 1,
        top_hits: [{ count: 1, value: 1 }],
      },
    })
  ).toBe(false);
  expect(
    isWithinLonRange('fieldAlpha', {
      fieldAlpha: {
        count: 1,
        cardinality: 1,
        top_hits: [{ count: 1, value: 200 }],
        max_value: 200,
        min_value: 0,
      },
    })
  ).toBe(false);
  expect(
    isWithinLonRange('fieldAlpha', {
      fieldAlpha: {
        count: 1,
        cardinality: 1,
        top_hits: [{ count: 1, value: -200 }],
        max_value: 0,
        min_value: -200,
      },
    })
  ).toBe(false);
  expect(
    isWithinLonRange('fieldAlpha', {
      fieldAlpha: {
        count: 1,
        cardinality: 1,
        top_hits: [{ count: 1, value: 0 }],
        max_value: 0,
        min_value: 0,
      },
    })
  ).toBe(true);
});
