/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { GeometryFilterForm } from './geometry_filter_form';

const defaultProps = {
  buttonLabel: 'Create filter',
  intitialGeometryLabel: 'My shape',
  onSubmit: () => {},
};

test('should not render relation select when geo field is geo_point', async () => {
  const component = shallow(
    <GeometryFilterForm
      {...defaultProps}
      geoFields={[
        {
          geoFieldName: 'my geo field',
          geoFieldType: 'geo_point',
          indexPatternTitle: 'My index',
          indexPatternId: 1,
        },
      ]}
    />
  );

  expect(component).toMatchSnapshot();
});

test('should render relation select when geo field is geo_shape', async () => {
  const component = shallow(
    <GeometryFilterForm
      {...defaultProps}
      geoFields={[
        {
          geoFieldName: 'my geo field',
          geoFieldType: 'geo_shape',
          indexPatternTitle: 'My index',
          indexPatternId: 1,
        },
      ]}
    />
  );

  expect(component).toMatchSnapshot();
});

test('should not show "within" relation when filter geometry is not closed', async () => {
  const component = shallow(
    <GeometryFilterForm
      {...defaultProps}
      geoFields={[
        {
          geoFieldName: 'my geo field',
          geoFieldType: 'geo_shape',
          indexPatternTitle: 'My index',
          indexPatternId: 1,
        },
      ]}
      isFilterGeometryClosed={false}
    />
  );

  expect(component).toMatchSnapshot();
});

test('should render error message', async () => {
  const component = shallow(
    <GeometryFilterForm
      {...defaultProps}
      geoFields={[
        {
          geoFieldName: 'my geo field',
          geoFieldType: 'geo_point',
          indexPatternTitle: 'My index',
          indexPatternId: 1,
        },
      ]}
      errorMsg="Simulated error"
    />
  );

  expect(component).toMatchSnapshot();
});
