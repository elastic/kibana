/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractReferences, injectReferences } from './references';

describe('extractReferences', () => {
  test('Should handle missing layerListJSON attribute', () => {
    const attributes = {
      title: 'my map',
    };
    expect(extractReferences({ attributes })).toEqual({
      attributes: {
        title: 'my map',
      },
      references: [],
    });
  });

  test('Should extract index-pattern reference from source with indexPatternId', () => {
    const attributes = {
      title: 'my map',
      layerListJSON:
        '[{"sourceDescriptor":{"indexPatternId":"c698b940-e149-11e8-a35a-370a8516603a"}}]',
    };
    expect(extractReferences({ attributes })).toEqual({
      attributes: {
        title: 'my map',
        layerListJSON:
          '[{"sourceDescriptor":{"indexPatternRefName":"layer_0_source_index_pattern"}}]',
      },
      references: [
        {
          id: 'c698b940-e149-11e8-a35a-370a8516603a',
          name: 'layer_0_source_index_pattern',
          type: 'index-pattern',
        },
      ],
    });
  });

  test('Should extract index-pattern reference from join with indexPatternId', () => {
    const attributes = {
      title: 'my map',
      layerListJSON:
        '[{"joins":[{"right":{"indexPatternId":"e20b2a30-f735-11e8-8ce0-9723965e01e3"}}]}]',
    };
    expect(extractReferences({ attributes })).toEqual({
      attributes: {
        title: 'my map',
        layerListJSON:
          '[{"joins":[{"right":{"indexPatternRefName":"layer_0_join_0_index_pattern"}}]}]',
      },
      references: [
        {
          id: 'e20b2a30-f735-11e8-8ce0-9723965e01e3',
          name: 'layer_0_join_0_index_pattern',
          type: 'index-pattern',
        },
      ],
    });
  });

  describe('embeddable', () => {
    test('Should extract index-pattern reference from source with indexPatternId', () => {
      const attributes = {
        title: 'my map',
        layerListJSON:
          '[{"sourceDescriptor":{"indexPatternId":"c698b940-e149-11e8-a35a-370a8516603a"}}]',
      };
      expect(extractReferences({ attributes, embeddableId: 'panel1' })).toEqual({
        attributes: {
          title: 'my map',
          layerListJSON:
            '[{"sourceDescriptor":{"indexPatternRefName":"panel1_layer_0_source_index_pattern"}}]',
        },
        references: [
          {
            id: 'c698b940-e149-11e8-a35a-370a8516603a',
            name: 'panel1_layer_0_source_index_pattern',
            type: 'index-pattern',
          },
        ],
      });
    });

    test('Should extract index-pattern reference from join with indexPatternId', () => {
      const attributes = {
        title: 'my map',
        layerListJSON:
          '[{"joins":[{"right":{"indexPatternId":"e20b2a30-f735-11e8-8ce0-9723965e01e3"}}]}]',
      };
      expect(extractReferences({ attributes, embeddableId: 'panel1' })).toEqual({
        attributes: {
          title: 'my map',
          layerListJSON:
            '[{"joins":[{"right":{"indexPatternRefName":"panel1_layer_0_join_0_index_pattern"}}]}]',
        },
        references: [
          {
            id: 'e20b2a30-f735-11e8-8ce0-9723965e01e3',
            name: 'panel1_layer_0_join_0_index_pattern',
            type: 'index-pattern',
          },
        ],
      });
    });
  });
});

describe('injectReferences', () => {
  test('Should handle missing layerListJSON attribute', () => {
    const attributes = {
      title: 'my map',
    };
    expect(injectReferences({ attributes, references: [] })).toEqual({
      attributes: {
        title: 'my map',
      },
    });
  });

  test('Should inject index-pattern reference into ES search source descriptor', () => {
    const attributes = {
      title: 'my map',
      layerListJSON:
        '[{"sourceDescriptor":{"indexPatternRefName":"layer_0_source_index_pattern"}}]',
    };
    const references = [
      {
        id: 'c698b940-e149-11e8-a35a-370a8516603a',
        name: 'layer_0_source_index_pattern',
        type: 'index-pattern',
      },
    ];
    expect(injectReferences({ attributes, references })).toEqual({
      attributes: {
        title: 'my map',
        layerListJSON:
          '[{"sourceDescriptor":{"indexPatternId":"c698b940-e149-11e8-a35a-370a8516603a"}}]',
      },
    });
  });

  test('Should inject index-pattern reference into joins', () => {
    const attributes = {
      title: 'my map',
      layerListJSON:
        '[{"joins":[{"right":{"indexPatternRefName":"layer_0_join_0_index_pattern"}}]}]',
    };
    const references = [
      {
        id: 'e20b2a30-f735-11e8-8ce0-9723965e01e3',
        name: 'layer_0_join_0_index_pattern',
        type: 'index-pattern',
      },
    ];
    expect(injectReferences({ attributes, references })).toEqual({
      attributes: {
        title: 'my map',
        layerListJSON:
          '[{"joins":[{"right":{"indexPatternId":"e20b2a30-f735-11e8-8ce0-9723965e01e3"}}]}]',
      },
    });
  });
});
