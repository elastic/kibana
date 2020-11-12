/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { shallow } from 'enzyme';
import { EntityIndexExpression } from './expressions/entity_index_expression';
import { IFieldType } from '../../../../../../../../../src/plugins/data/common/index_patterns/fields';
import { KBN_FIELD_TYPES } from '../../../../../../../../../src/plugins/data/common';
import { BoundaryIndexExpression } from './expressions/boundary_index_expression';

test('should render EntityIndexExpression', async () => {
  const dateField: IFieldType = {
    type: KBN_FIELD_TYPES.DATE,
    name: KBN_FIELD_TYPES.STRING,
    aggregatable: true,
  };
  const geoField: IFieldType = {
    type: KBN_FIELD_TYPES.GEO_POINT,
    name: KBN_FIELD_TYPES.STRING,
    aggregatable: true,
  };
  const alertsContext = {};
  const component = shallow(
    <EntityIndexExpression
      dateField={dateField}
      geoField={geoField}
      alertsContext={alertsContext}
      errors={[]}
      setAlertParamsDate={() => {}}
      setAlertParamsGeoField={() => {}}
      setAlertProperty={() => {}}
      setIndexPattern={() => {}}
      indexPattern={''}
      isInvalid={false}
    />
  );

  expect(component).toMatchSnapshot();
});

test('should render EntityIndexExpression w/ invalid flag if invalid', async () => {
  const dateField: IFieldType = {
    type: KBN_FIELD_TYPES.DATE,
    name: KBN_FIELD_TYPES.STRING,
    aggregatable: true,
  };
  const geoField: IFieldType = {
    type: KBN_FIELD_TYPES.GEO_POINT,
    name: KBN_FIELD_TYPES.STRING,
    aggregatable: true,
  };
  const alertsContext = {};
  const component = shallow(
    <EntityIndexExpression
      dateField={dateField}
      geoField={geoField}
      alertsContext={alertsContext}
      errors={[]}
      setAlertParamsDate={() => {}}
      setAlertParamsGeoField={() => {}}
      setAlertProperty={() => {}}
      setIndexPattern={() => {}}
      indexPattern={''}
      isInvalid={true}
    />
  );

  expect(component).toMatchSnapshot();
});

test('should render BoundaryIndexExpression', async () => {
  const alertsContext = {};
  const component = shallow(
    <BoundaryIndexExpression
      alertParams={{}}
      alertsContext={alertsContext}
      errors={[]}
      boundaryIndexPattern={''}
      setBoundaryIndexPattern={() => {}}
      setBoundaryGeoField={() => {}}
      setBoundaryNameField={() => {}}
      boundaryNameField={''}
    />
  );

  expect(component).toMatchSnapshot();
});
