/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extract } from './extract';

test('Should return original state and empty references with by-reference embeddable state', () => {
  const mapByReferenceInput = {
    id: '2192e502-0ec7-4316-82fb-c9bbf78525c4',
    type: 'map',
  };

  expect(extract!(mapByReferenceInput)).toEqual({
    state: mapByReferenceInput,
    references: [],
  });
});

test('Should update state with refNames with by-value embeddable state', () => {
  const mapByValueInput = {
    id: '8d62c3f0-c61f-4c09-ac24-9b8ee4320e20',
    attributes: {
      layerListJSON:
        '[{"sourceDescriptor":{"indexPatternId":"90943e30-9a47-11e8-b64d-95841ca0b247"}}]',
    },
    type: 'map',
  };

  expect(extract!(mapByValueInput)).toEqual({
    references: [
      {
        id: '90943e30-9a47-11e8-b64d-95841ca0b247',
        name: 'layer_0_source_index_pattern',
        type: 'index-pattern',
      },
    ],
    state: {
      id: '8d62c3f0-c61f-4c09-ac24-9b8ee4320e20',
      attributes: {
        layerListJSON:
          '[{"sourceDescriptor":{"indexPatternRefName":"layer_0_source_index_pattern"}}]',
      },
      type: 'map',
    },
  });
});
