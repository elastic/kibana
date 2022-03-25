/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../components/vector_style_editor', () => ({
  VectorStyleEditor: () => {
    return <div>mockVectorStyleEditor</div>;
  },
}));

import React from 'react';

// @ts-ignore
import { DynamicTextProperty } from './dynamic_text_property';
import { RawValue, VECTOR_STYLES } from '../../../../../common/constants';
import { IField } from '../../../fields/field';
import type { Map as MbMap } from '@kbn/mapbox-gl';
import { MockLayer, MockStyle } from './test_helpers/test_util';
import { IVectorLayer } from '../../../layers/vector_layer';

export class MockMbMap {
  _paintPropertyCalls: unknown[];
  _lastTextFieldValue: unknown | undefined;

  constructor(lastTextFieldValue?: unknown) {
    this._paintPropertyCalls = [];
    this._lastTextFieldValue = lastTextFieldValue;
  }
  setLayoutProperty(layerId: string, propName: string, value: undefined | 'string') {
    if (propName !== 'text-field') {
      throw new Error('should only use to test `text-field`');
    }
    this._lastTextFieldValue = value;
    this._paintPropertyCalls.push([layerId, value]);
  }

  getLayoutProperty(layername: string, propName: string): unknown | undefined {
    if (propName !== 'text-field') {
      throw new Error('should only use to test `text-field`');
    }
    return this._lastTextFieldValue;
  }

  getPaintPropertyCalls(): unknown[] {
    return this._paintPropertyCalls;
  }
}

describe('syncTextFieldWithMb', () => {
  describe('with field', () => {
    test('Should set text-field', async () => {
      const field = {
        isValid: () => {
          return true;
        },
        getName: () => {
          return 'foobar';
        },
        getSource: () => {
          return {
            isMvt: () => {
              return false;
            },
          };
        },
        supportsFieldMetaFromLocalData: () => {
          return true;
        },
        isCount: () => {
          return false;
        },
      } as unknown as IField;
      const dynamicTextProperty = new DynamicTextProperty(
        {},
        VECTOR_STYLES.LABEL_TEXT,
        field,
        new MockLayer(new MockStyle({ min: 0, max: 100 })) as unknown as IVectorLayer,
        () => {
          return (value: RawValue) => value + '_format';
        }
      );

      const mockMbMap = new MockMbMap() as unknown as MbMap;

      dynamicTextProperty.syncTextFieldWithMb('foobar', mockMbMap);

      // @ts-expect-error
      expect(mockMbMap.getPaintPropertyCalls()).toEqual([
        ['foobar', ['coalesce', ['get', '__kbn__dynamic__foobar__labelText'], '']],
      ]);
    });
  });

  describe('without field', () => {
    test('Should clear text-field', async () => {
      const dynamicTextProperty = new DynamicTextProperty(
        {},
        VECTOR_STYLES.LABEL_TEXT,
        null,
        new MockLayer(new MockStyle({ min: 0, max: 100 })) as unknown as IVectorLayer,
        () => {
          return (value: RawValue) => value + '_format';
        }
      );

      const mockMbMap = new MockMbMap([
        'foobar',
        ['coalesce', ['get', '__kbn__dynamic__foobar__labelText'], ''],
      ]) as unknown as MbMap;

      dynamicTextProperty.syncTextFieldWithMb('foobar', mockMbMap);

      // @ts-expect-error
      expect(mockMbMap.getPaintPropertyCalls()).toEqual([['foobar', undefined]]);
    });

    test('Should not set or clear text-field', async () => {
      // This verifies a weird edge-case in mapbox-gl, where setting the `text-field` layout-property to null causes tiles to be invalidated.
      // This triggers a refetch of the tile during panning and zooming
      // This affects vector-tile rendering in tiled_vector_layers with custom vector_styles
      // It does _not_ affect EMS, since that does not have a code-path where a `text-field` need to be resynced.
      // Do not remove this logic without verifying that mapbox-gl does not re-issue tile-requests for previously requested tiles

      const dynamicTextProperty = new DynamicTextProperty(
        {},
        VECTOR_STYLES.LABEL_TEXT,
        null,
        new MockLayer(new MockStyle({ min: 0, max: 100 })) as unknown as IVectorLayer,
        () => {
          return (value: RawValue) => value + '_format';
        }
      );
      const mockMbMap = new MockMbMap(undefined) as unknown as MbMap;

      dynamicTextProperty.syncTextFieldWithMb('foobar', mockMbMap);

      // @ts-expect-error
      expect(mockMbMap.getPaintPropertyCalls()).toEqual([]);
    });
  });
});
