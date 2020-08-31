/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { addFieldMetaOptions } from './add_field_meta_options';
import { LAYER_TYPE, STYLE_TYPE } from '../constants';

describe('addFieldMetaOptions', () => {
  test('Should handle missing layerListJSON attribute', () => {
    const attributes = {
      title: 'my map',
    };
    expect(addFieldMetaOptions({ attributes })).toEqual({
      title: 'my map',
    });
  });

  test('Should ignore non-vector layers', () => {
    const layerListJSON = JSON.stringify([
      {
        type: LAYER_TYPE.HEATMAP,
        style: {
          type: 'HEATMAP',
          colorRampName: 'Greens',
        },
      },
    ]);
    const attributes = {
      title: 'my map',
      layerListJSON,
    };
    expect(addFieldMetaOptions({ attributes })).toEqual({
      title: 'my map',
      layerListJSON,
    });
  });

  test('Should ignore static style properties', () => {
    const layerListJSON = JSON.stringify([
      {
        type: LAYER_TYPE.VECTOR,
        style: {
          type: 'VECTOR',
          properties: {
            lineColor: {
              type: STYLE_TYPE.STATIC,
              options: {
                color: '#FFFFFF',
              },
            },
          },
        },
      },
    ]);
    const attributes = {
      title: 'my map',
      layerListJSON,
    };
    expect(addFieldMetaOptions({ attributes })).toEqual({
      title: 'my map',
      layerListJSON,
    });
  });

  test('Should add field meta options to dynamic style properties', () => {
    const layerListJSON = JSON.stringify([
      {
        type: LAYER_TYPE.VECTOR,
        style: {
          type: 'VECTOR',
          properties: {
            fillColor: {
              type: STYLE_TYPE.DYNAMIC,
              options: {
                field: {
                  name: 'my_field',
                  origin: 'source',
                },
                color: 'Greys',
              },
            },
          },
        },
      },
    ]);
    const attributes = {
      title: 'my map',
      layerListJSON,
    };
    expect(addFieldMetaOptions({ attributes })).toEqual({
      title: 'my map',
      layerListJSON: JSON.stringify([
        {
          type: LAYER_TYPE.VECTOR,
          style: {
            type: 'VECTOR',
            properties: {
              fillColor: {
                type: STYLE_TYPE.DYNAMIC,
                options: {
                  field: {
                    name: 'my_field',
                    origin: 'source',
                  },
                  color: 'Greys',
                  fieldMetaOptions: {
                    isEnabled: false,
                    sigma: 3,
                  },
                },
              },
            },
          },
        },
      ]),
    });
  });
});
