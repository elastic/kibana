/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { MetricsExpression } from './metrics_expression';
import { AGG_TYPE } from '../../../../../common/constants';

const defaultProps = {
  onChange: () => {},
  metrics: [{ type: AGG_TYPE.COUNT }],
  rightFields: [],
};

test('Should render default props', () => {
  const component = shallow(<MetricsExpression {...defaultProps} />);

  expect(component).toMatchSnapshot();
});

test('Should render metrics expression for metrics', () => {
  const component = shallow(
    <MetricsExpression
      {...defaultProps}
      metrics={[
        { type: AGG_TYPE.COUNT, label: 'my count' }, // should ignore label
        { type: AGG_TYPE.MAX }, // incomplete - no field, should not be included in expression
        { type: AGG_TYPE.MAX, field: 'prop1', label: 'mostest' }, // should ignore label
      ]}
    />
  );

  expect(component).toMatchSnapshot();
});
