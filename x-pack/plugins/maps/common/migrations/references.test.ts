/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractReferences, injectReferences } from './references';
import { SOURCE_TYPES } from '../constants';

const layerListJSON = {
  esSearchSource: {
    withIndexPatternId: `[{\"sourceDescriptor\":{\"type\":\"${SOURCE_TYPES.ES_SEARCH}\",\"indexPatternId\":\"c698b940-e149-11e8-a35a-370a8516603a\"}}]`,
    withIndexPatternRef: `[{\"sourceDescriptor\":{\"type\":\"${SOURCE_TYPES.ES_SEARCH}\",\"indexPatternRefName\":\"layer_0_source_index_pattern\"}}]`,
  },
  esGeoGridSource: {
    withIndexPatternId: `[{\"sourceDescriptor\":{\"type\":\"${SOURCE_TYPES.ES_GEO_GRID}\",\"indexPatternId\":\"c698b940-e149-11e8-a35a-370a8516603a\"}}]`,
    withIndexPatternRef: `[{\"sourceDescriptor\":{\"type\":\"${SOURCE_TYPES.ES_GEO_GRID}\",\"indexPatternRefName\":\"layer_0_source_index_pattern\"}}]`,
  },
  join: {
    withIndexPatternId:
      '[{"joins":[{"right":{"indexPatternId":"e20b2a30-f735-11e8-8ce0-9723965e01e3"}}]}]',
    withIndexPatternRef:
      '[{"joins":[{"right":{"indexPatternRefName":"layer_0_join_0_index_pattern"}}]}]',
  },
  pewPewSource: {
    withIndexPatternId: `[{\"sourceDescriptor\":{\"type\":\"${SOURCE_TYPES.ES_PEW_PEW}\",\"indexPatternId\":\"c698b940-e149-11e8-a35a-370a8516603a\"}}]`,
    withIndexPatternRef: `[{\"sourceDescriptor\":{\"type\":\"${SOURCE_TYPES.ES_PEW_PEW}\",\"indexPatternRefName\":\"layer_0_source_index_pattern\"}}]`,
  },
};

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

  test('Should handle mapStateJSON without adHocDataViews', () => {
    const mapStateJSON = JSON.stringify({});
    const attributes = {
      title: 'my map',
      mapStateJSON,
    };
    expect(extractReferences({ attributes })).toEqual({
      attributes: {
        title: 'my map',
        mapStateJSON,
      },
      references: [],
    });
  });

  test('Should extract index-pattern reference from ES search source descriptor', () => {
    const attributes = {
      title: 'my map',
      layerListJSON: layerListJSON.esSearchSource.withIndexPatternId,
    };
    expect(extractReferences({ attributes })).toEqual({
      attributes: {
        title: 'my map',
        layerListJSON: layerListJSON.esSearchSource.withIndexPatternRef,
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

  test('Should ignore adhoc data view reference from search source', () => {
    const mapStateJSON = JSON.stringify({
      adHocDataViews: [
        {
          id: 'c698b940-e149-11e8-a35a-370a8516603a',
        },
      ],
    });

    const attributes = {
      title: 'my map',
      layerListJSON: layerListJSON.esSearchSource.withIndexPatternId,
      mapStateJSON,
    };
    expect(extractReferences({ attributes })).toEqual({
      attributes: {
        title: 'my map',
        layerListJSON: layerListJSON.esSearchSource.withIndexPatternId,
        mapStateJSON,
      },
      references: [],
    });
  });

  test('Should extract index-pattern reference from ES geo grid source descriptor', () => {
    const attributes = {
      title: 'my map',
      layerListJSON: layerListJSON.esGeoGridSource.withIndexPatternId,
    };
    expect(extractReferences({ attributes })).toEqual({
      attributes: {
        title: 'my map',
        layerListJSON: layerListJSON.esGeoGridSource.withIndexPatternRef,
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

  test('Should extract index-pattern reference from ES pew pew source descriptor', () => {
    const attributes = {
      title: 'my map',
      layerListJSON: layerListJSON.pewPewSource.withIndexPatternId,
    };
    expect(extractReferences({ attributes })).toEqual({
      attributes: {
        title: 'my map',
        layerListJSON: layerListJSON.pewPewSource.withIndexPatternRef,
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

  test('Should extract index-pattern reference from joins', () => {
    const attributes = {
      title: 'my map',
      layerListJSON: layerListJSON.join.withIndexPatternId,
    };
    expect(extractReferences({ attributes })).toEqual({
      attributes: {
        title: 'my map',
        layerListJSON: layerListJSON.join.withIndexPatternRef,
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

  test('Should ignore adhoc data view reference from joins', () => {
    const mapStateJSON = JSON.stringify({
      adHocDataViews: [
        {
          id: 'e20b2a30-f735-11e8-8ce0-9723965e01e3',
        },
      ],
    });
    const attributes = {
      title: 'my map',
      layerListJSON: layerListJSON.join.withIndexPatternId,
      mapStateJSON,
    };
    expect(extractReferences({ attributes })).toEqual({
      attributes: {
        title: 'my map',
        layerListJSON: layerListJSON.join.withIndexPatternId,
        mapStateJSON,
      },
      references: [],
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
      layerListJSON: layerListJSON.esSearchSource.withIndexPatternRef,
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
        layerListJSON: layerListJSON.esSearchSource.withIndexPatternId,
      },
    });
  });

  test('Should inject index-pattern reference into ES geo grid source descriptor', () => {
    const attributes = {
      title: 'my map',
      layerListJSON: layerListJSON.esGeoGridSource.withIndexPatternRef,
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
        layerListJSON: layerListJSON.esGeoGridSource.withIndexPatternId,
      },
    });
  });

  test('Should inject index-pattern reference into ES pew pew source descriptor', () => {
    const attributes = {
      title: 'my map',
      layerListJSON: layerListJSON.pewPewSource.withIndexPatternRef,
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
        layerListJSON: layerListJSON.pewPewSource.withIndexPatternId,
      },
    });
  });

  test('Should inject index-pattern reference into joins', () => {
    const attributes = {
      title: 'my map',
      layerListJSON: layerListJSON.join.withIndexPatternRef,
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
        layerListJSON: layerListJSON.join.withIndexPatternId,
      },
    });
  });
});
