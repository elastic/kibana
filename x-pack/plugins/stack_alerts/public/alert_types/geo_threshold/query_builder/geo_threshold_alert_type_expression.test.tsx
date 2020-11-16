/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { EntityIndexExpression } from './expressions/entity_index_expression';
import { BoundaryIndexExpression } from './expressions/boundary_index_expression';
import { ApplicationStart, DocLinksStart, HttpSetup, ToastsStart } from 'kibana/public';
import {
  ActionTypeRegistryContract,
  AlertTypeRegistryContract,
  IErrorObject,
} from '../../../../../triggers_actions_ui/public';
import { IIndexPattern } from '../../../../../../../src/plugins/data/common';

const alertsContext = {
  http: (null as unknown) as HttpSetup,
  alertTypeRegistry: (null as unknown) as AlertTypeRegistryContract,
  actionTypeRegistry: (null as unknown) as ActionTypeRegistryContract,
  toastNotifications: (null as unknown) as ToastsStart,
  docLinks: (null as unknown) as DocLinksStart,
  capabilities: (null as unknown) as ApplicationStart['capabilities'],
};

const alertParams = {
  index: '',
  indexId: '',
  geoField: '',
  entity: '',
  dateField: '',
  trackingEvent: '',
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
      alertsContext={alertsContext}
      errors={{} as IErrorObject}
      setAlertParamsDate={() => {}}
      setAlertParamsGeoField={() => {}}
      setAlertProperty={() => {}}
      setIndexPattern={() => {}}
      indexPattern={('' as unknown) as IIndexPattern}
      isInvalid={false}
    />
  );

  expect(component).toMatchSnapshot();
});

test('should render EntityIndexExpression w/ invalid flag if invalid', async () => {
  const component = shallow(
    <EntityIndexExpression
      dateField={'testDateField'}
      geoField={'testGeoField'}
      alertsContext={alertsContext}
      errors={{} as IErrorObject}
      setAlertParamsDate={() => {}}
      setAlertParamsGeoField={() => {}}
      setAlertProperty={() => {}}
      setIndexPattern={() => {}}
      indexPattern={('' as unknown) as IIndexPattern}
      isInvalid={true}
    />
  );

  expect(component).toMatchSnapshot();
});

test('should render BoundaryIndexExpression', async () => {
  const component = shallow(
    <BoundaryIndexExpression
      alertParams={alertParams}
      alertsContext={alertsContext}
      errors={{} as IErrorObject}
      boundaryIndexPattern={('' as unknown) as IIndexPattern}
      setBoundaryIndexPattern={() => {}}
      setBoundaryGeoField={() => {}}
      setBoundaryNameField={() => {}}
      boundaryNameField={'testNameField'}
    />
  );

  expect(component).toMatchSnapshot();
});
