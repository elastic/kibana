/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('../../../kibana_services', () => {
  const mockUiSettings = {
    get: () => {
      return undefined;
    },
  };
  return {
    getUiSettings: () => {
      return mockUiSettings;
    },
  };
});

import { VECTOR_STYLES } from '../../../../common/constants';
import { getDefaultStaticProperties } from './vector_style_defaults';

describe('getDefaultStaticProperties', () => {
  test('Should use first color in DEFAULT_*_COLORS when no colors are used on the map', () => {
    const styleProperties = getDefaultStaticProperties([]);
    expect(styleProperties[VECTOR_STYLES.FILL_COLOR]!.options.color).toBe('#54B399');
    expect(styleProperties[VECTOR_STYLES.LINE_COLOR]!.options.color).toBe('#41937c');
  });

  test('Should next color in DEFAULT_*_COLORS when colors are used on the map', () => {
    const styleProperties = getDefaultStaticProperties(['#54B399']);
    expect(styleProperties[VECTOR_STYLES.FILL_COLOR]!.options.color).toBe('#6092C0');
    expect(styleProperties[VECTOR_STYLES.LINE_COLOR]!.options.color).toBe('#4379aa');
  });
});
