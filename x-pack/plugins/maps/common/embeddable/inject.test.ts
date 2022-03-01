/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject } from './inject';

test('Should return original state with by-reference embeddable state', () => {
  const mapByReferenceInput = {
    id: '2192e502-0ec7-4316-82fb-c9bbf78525c4',
    type: 'map',
  };

  const refernces = [
    {
      name: 'panel_2192e502-0ec7-4316-82fb-c9bbf78525c4',
      type: 'map',
      id: '7f92d7d0-8e5f-11ec-9477-312c8a6de896',
    },
  ];

  expect(inject!(mapByReferenceInput, refernces)).toEqual(mapByReferenceInput);
});

test('Should inject refNames with by-value embeddable state', () => {
  const mapByValueInput = {
    id: '8d62c3f0-c61f-4c09-ac24-9b8ee4320e20',
    attributes: {
      layerListJSON:
        '[{"sourceDescriptor":{"indexPatternRefName":"layer_0_source_index_pattern"}}]',
    },
    type: 'map',
  };
  const refernces = [
    {
      name: 'layer_0_source_index_pattern',
      type: 'index-pattern',
      id: 'changed_index_pattern_id',
    },
  ];

  expect(inject!(mapByValueInput, refernces)).toEqual({
    id: '8d62c3f0-c61f-4c09-ac24-9b8ee4320e20',
    attributes: {
      layerListJSON: '[{"sourceDescriptor":{"indexPatternId":"changed_index_pattern_id"}}]',
    },
    type: 'map',
  });
});
