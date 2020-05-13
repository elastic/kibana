/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable-next-line max-classes-per-file
import { shallow } from 'enzyme';

jest.mock('ui/new_platform');
jest.mock('../components/vector_style_editor', () => ({
  VectorStyleEditor: () => {
    return <div>mockVectorStyleEditor</div>;
  },
}));

import { COLOR_MAP_TYPE, FIELD_ORIGIN, VECTOR_STYLES } from '../../../../../common/constants';

// @ts-ignore
import { DynamicIconProperty } from './dynamic_icon_property';

import React from 'react';
import { StyleMeta } from '../style_meta';

const mockField = {
  async getLabel() {
    return 'foobar_label';
  },
  getName() {
    return 'foobar';
  },
  getRootName() {
    return 'foobar';
  },
  getOrigin() {
    return FIELD_ORIGIN.SOURCE;
  },
  supportsFieldMeta() {
    return true;
  },
};

class MockStyle {
  getStyleMeta() {
    return new StyleMeta({
      geometryTypes: {
        isPointsOnly: false,
        isLinesOnly: false,
        isPolygonsOnly: false,
      },
      fieldMeta: {
        foobar: {
          range: { min: 0, max: 100 },
          categories: {
            categories: [
              {
                key: 'US',
                count: 10,
              },
              {
                key: 'CN',
                count: 8,
              },
            ],
          },
        },
      },
    });
  }
}

class MockLayer {
  getStyle() {
    return new MockStyle();
  }

  getDataRequest() {
    return null;
  }
}

const makeProperty = (options, field = mockField) => {
  return new DynamicIconProperty(options, VECTOR_STYLES.ICON, field, new MockLayer(), () => {
    return x => x + '_format';
  });
};

describe('DynamicIconProperty', () => {
  it('should derive category number from palettes', async () => {
    const filled = makeProperty({
      iconPaletteId: 'filledShapes',
    });
    expect(filled.getNumberOfCategories()).toEqual(6);
    const hollow = makeProperty({
      iconPaletteId: 'hollowShapes',
    });
    expect(hollow.getNumberOfCategories()).toEqual(5);
  });
});

test('Should render categorical legend with breaks', async () => {
  const iconStyle = makeProperty({
    iconPaletteId: 'filledShapes',
  });

  const legendRow = iconStyle.renderLegendDetailRow({ isPointsOnly: true, isLinesOnly: false });
  const component = shallow(legendRow);
  await new Promise(resolve => process.nextTick(resolve));
  component.update();

  expect(component).toMatchSnapshot();
});
