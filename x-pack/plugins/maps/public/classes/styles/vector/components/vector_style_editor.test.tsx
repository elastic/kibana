/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { StyleProperties, VectorStyleEditor } from './vector_style_editor';
import { getDefaultStaticProperties } from '../vector_style_defaults';
import { IVectorLayer } from '../../../layers/vector_layer';
import { IVectorSource } from '../../../sources/vector_source';
import {
  FIELD_ORIGIN,
  LAYER_STYLE_TYPE,
  VECTOR_SHAPE_TYPE,
  VECTOR_STYLES,
} from '../../../../../common/constants';
import { AbstractField, IField } from '../../../fields/field';
import { VectorStyle } from '../vector_style';

jest.mock('../../../../kibana_services', () => {
  return {
    getIsDarkMode() {
      return false;
    },
  };
});

class MockField extends AbstractField {
  supportsFieldMetaFromLocalData(): boolean {
    return true;
  }
}

function createLayerMock(numFields: number, supportedShapeTypes: VECTOR_SHAPE_TYPE[]) {
  const fields: IField[] = [];
  for (let i = 0; i < numFields; i++) {
    fields.push(new MockField({ fieldName: `field${i}`, origin: FIELD_ORIGIN.SOURCE }));
  }
  return {
    getStyleEditorFields: async () => {
      return fields;
    },
    getSource: () => {
      return {
        getSupportedShapeTypes: async () => {
          return supportedShapeTypes;
        },
      } as unknown as IVectorSource;
    },
  } as unknown as IVectorLayer;
}

const vectorStyleDescriptor = {
  type: LAYER_STYLE_TYPE.VECTOR,
  properties: getDefaultStaticProperties(),
  isTimeAware: true,
};
const vectorStyle = new VectorStyle(
  vectorStyleDescriptor,
  {} as unknown as IVectorSource,
  {} as unknown as IVectorLayer
);
const styleProperties: StyleProperties = {};
vectorStyle.getAllStyleProperties().forEach((styleProperty) => {
  styleProperties[styleProperty.getStyleName()] = styleProperty;
});

const defaultProps = {
  layer: createLayerMock(1, [VECTOR_SHAPE_TYPE.POLYGON]),
  isPointsOnly: true,
  isLinesOnly: false,
  onIsTimeAwareChange: (isTimeAware: boolean) => {},
  handlePropertyChange: (propertyName: VECTOR_STYLES, stylePropertyDescriptor: unknown) => {},
  hasBorder: true,
  styleProperties,
  isTimeAware: true,
  showIsTimeAware: true,
};

test('should render', async () => {
  const component = shallow(<VectorStyleEditor {...defaultProps} />);

  // Ensure all promises resolve
  await new Promise((resolve) => process.nextTick(resolve));
  // Ensure the state changes are reflected
  component.update();

  expect(component).toMatchSnapshot();
});

test('should render with no style fields', async () => {
  const component = shallow(
    <VectorStyleEditor {...defaultProps} layer={createLayerMock(0, [VECTOR_SHAPE_TYPE.POLYGON])} />
  );

  // Ensure all promises resolve
  await new Promise((resolve) => process.nextTick(resolve));
  // Ensure the state changes are reflected
  component.update();

  expect(component).toMatchSnapshot();
});
