/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { EntityIndexExpression } from './expressions/entity_index_expression';
import { BoundaryIndexExpression } from './expressions/boundary_index_expression';
import { IErrorObject } from '../../../../../triggers_actions_ui/public';
import { IIndexPattern } from '../../../../../../../src/plugins/data/common';
import { dataPluginMock } from 'src/plugins/data/public/mocks';

const dataStartMock = dataPluginMock.createStartContract();

const alertParams = {
  index: '',
  indexId: '',
  geoField: '',
  entity: '',
  dateField: '',
  boundaryType: '',
  boundaryIndexTitle: '',
  boundaryIndexId: '',
  boundaryGeoField: '',
};

test('should render EntityIndexExpression', async () => {
  const component = shallow(
    <EntityIndexExpression
      dateField={'testDateField'}
      geoField={'testGeoField'}
      errors={{} as IErrorObject}
      setAlertParamsDate={() => {}}
      setAlertParamsGeoField={() => {}}
      setAlertProperty={() => {}}
      setIndexPattern={() => {}}
      indexPattern={'' as unknown as IIndexPattern}
      isInvalid={false}
      data={dataStartMock}
    />
  );

  expect(component).toMatchSnapshot();
});

test('should render EntityIndexExpression w/ invalid flag if invalid', async () => {
  const component = shallow(
    <EntityIndexExpression
      dateField={'testDateField'}
      geoField={'testGeoField'}
      errors={{} as IErrorObject}
      setAlertParamsDate={() => {}}
      setAlertParamsGeoField={() => {}}
      setAlertProperty={() => {}}
      setIndexPattern={() => {}}
      indexPattern={'' as unknown as IIndexPattern}
      isInvalid={true}
      data={dataStartMock}
    />
  );

  expect(component).toMatchSnapshot();
});

test('should render BoundaryIndexExpression', async () => {
  const component = shallow(
    <BoundaryIndexExpression
      alertParams={alertParams}
      errors={{} as IErrorObject}
      boundaryIndexPattern={'' as unknown as IIndexPattern}
      setBoundaryIndexPattern={() => {}}
      setBoundaryGeoField={() => {}}
      setBoundaryNameField={() => {}}
      boundaryNameField={'testNameField'}
      data={dataStartMock}
    />
  );

  expect(component).toMatchSnapshot();
});
