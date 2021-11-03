/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StaticTextProperty } from './static_text_property';
import { VECTOR_STYLES } from '../../../../../common/constants';
import type { Map as MbMap } from '@kbn/mapbox-gl';

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

const makeProperty = (value: string) => {
  return new StaticTextProperty({ value }, VECTOR_STYLES.LABEL_TEXT);
};

describe('syncTextFieldWithMb', () => {
  test('Should set with value', async () => {
    const dynamicTextProperty = makeProperty('foo');
    const mockMbMap = new MockMbMap() as unknown as MbMap;

    dynamicTextProperty.syncTextFieldWithMb('foobar', mockMbMap);

    // @ts-expect-error
    expect(mockMbMap.getPaintPropertyCalls()).toEqual([['foobar', 'foo']]);
  });

  test('Should not clear when already cleared', async () => {
    // This verifies a weird edge-case in mapbox-gl, where setting the `text-field` layout-property to null causes tiles to be invalidated.
    // This triggers a refetch of the tile during panning and zooming
    // This affects vector-tile rendering in tiled_vector_layers with custom vector_styles
    // It does _not_ affect EMS, since that does not have a code-path where a `text-field` need to be resynced.
    // Do not remove this logic without verifying that mapbox-gl does not re-issue tile-requests for previously requested tiles

    const dynamicTextProperty = makeProperty('');
    const mockMbMap = new MockMbMap(undefined) as unknown as MbMap;

    dynamicTextProperty.syncTextFieldWithMb('foobar', mockMbMap);

    // @ts-expect-error
    expect(mockMbMap.getPaintPropertyCalls()).toEqual([]);
  });
});
