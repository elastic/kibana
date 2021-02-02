/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { addTypeToTermJoin } from './add_type_to_termjoin';
import { LAYER_TYPE, SOURCE_TYPES } from '../constants';
import { LayerDescriptor } from '../descriptor_types';

describe('addTypeToTermJoin', () => {
  test('Should handle missing type attribute', () => {
    const layerListJSON = JSON.stringify(([
      {
        type: LAYER_TYPE.VECTOR,
        joins: [
          {
            right: {},
          },
          {
            right: {
              type: SOURCE_TYPES.TABLE_SOURCE,
            },
          },
          {
            right: {
              type: SOURCE_TYPES.ES_TERM_SOURCE,
            },
          },
        ],
      },
    ] as unknown) as LayerDescriptor[]);

    const attributes = {
      title: 'my map',
      layerListJSON,
    };

    const { layerListJSON: migratedLayerListJSON } = addTypeToTermJoin({ attributes });
    const migratedLayerList = JSON.parse(migratedLayerListJSON!);
    expect(migratedLayerList[0].joins[0].right.type).toEqual(SOURCE_TYPES.ES_TERM_SOURCE);
    expect(migratedLayerList[0].joins[1].right.type).toEqual(SOURCE_TYPES.TABLE_SOURCE);
    expect(migratedLayerList[0].joins[2].right.type).toEqual(SOURCE_TYPES.ES_TERM_SOURCE);
  });
});
