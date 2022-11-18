/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Map as MbMap } from '@kbn/mapbox-gl';
import { LABEL_POSITIONS, VECTOR_STYLES } from '../../../../../common/constants';
import { LabelPositionProperty } from './label_position_property';
import { StaticIconProperty } from './static_icon_property';
import { StaticSizeProperty } from './static_size_property';

describe('syncLabelPositionWithMb', () => {
  let layoutProperties: Record<string, unknown> = {};
  const mockMbMap = {
    setLayoutProperty: (layerId: string, propName: string, propValue: unknown) => {
      layoutProperties[propName] = propValue;
    },
  } as unknown as MbMap;

  beforeEach(() => {
    layoutProperties = {};
  });

  describe('center', () => {
    test('should set center layout values when position is center', () => {
      const labelPosition = new LabelPositionProperty(
        {
          position: LABEL_POSITIONS.CENTER,
        },
        VECTOR_STYLES.LABEL_POSITION,
        {} as unknown as StaticIconProperty,
        {} as unknown as StaticSizeProperty,
        {} as unknown as StaticSizeProperty,
        false
      );
      labelPosition.syncLabelPositionWithMb('layerId', mockMbMap);
      expect(layoutProperties).toEqual({
        'text-anchor': 'center',
        'text-offset': [0, 0],
      });
    });

    test('should set center layout values when disabled', () => {
      const labelPosition = new LabelPositionProperty(
        {
          position: LABEL_POSITIONS.TOP,
        },
        VECTOR_STYLES.LABEL_POSITION,
        {} as unknown as StaticIconProperty,
        {} as unknown as StaticSizeProperty,
        {} as unknown as StaticSizeProperty,
        false
      );
      labelPosition.isDisabled = () => {
        return true;
      };
      labelPosition.syncLabelPositionWithMb('layerId', mockMbMap);
      expect(layoutProperties).toEqual({
        'text-anchor': 'center',
        'text-offset': [0, 0],
      });
    });
  });
});
