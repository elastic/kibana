/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { EntityByExpression, getValidIndexPatternFields } from './entity_by_expression';
import { DataViewField } from '@kbn/data-views-plugin/public';

const defaultProps = {
  errors: {
    index: [],
    indexId: [],
    geoField: [],
    entity: [],
    dateField: [],
    boundaryType: [],
    boundaryIndexTitle: [],
    boundaryIndexId: [],
    boundaryGeoField: [],
    name: ['Name is required.'],
    interval: [],
    alertTypeId: [],
    actionConnectors: [],
  },
  entity: 'FlightNum',
  setAlertParamsEntity: (arg: string) => {},
  indexFields: [
    {
      count: 0,
      name: 'DestLocation',
      type: 'geo_point',
      esTypes: ['geo_point'],
      scripted: false,
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    },
    {
      count: 0,
      name: 'FlightNum',
      type: 'string',
      esTypes: ['keyword'],
      scripted: false,
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    },
    {
      count: 0,
      name: 'OriginLocation',
      type: 'geo_point',
      esTypes: ['geo_point'],
      scripted: false,
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    },
    {
      count: 0,
      name: 'timestamp',
      type: 'date',
      esTypes: ['date'],
      scripted: false,
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    },
  ] as DataViewField[],
  isInvalid: false,
};

test('should render entity by expression with aggregatable field options for entity', async () => {
  const component = mount(<EntityByExpression {...defaultProps} />);
  expect(component).toMatchSnapshot();
});
//

test('should only use valid index fields', async () => {
  // Only the string index field should match
  const indexFields = getValidIndexPatternFields(defaultProps.indexFields);
  expect(indexFields.length).toEqual(1);

  // Set all agg fields to false, invalidating them for use
  const invalidIndexFields = defaultProps.indexFields.map((field) => ({
    ...field,
    aggregatable: false,
  }));

  const noIndexFields = getValidIndexPatternFields(invalidIndexFields as DataViewField[]);
  expect(noIndexFields.length).toEqual(0);
});
