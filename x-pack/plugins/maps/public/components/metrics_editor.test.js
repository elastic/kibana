/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { MetricsEditor } from './metrics_editor';
import { AGG_TYPE } from '../../common/constants';

const defaultProps = {
  metrics: [
    {
      type: AGG_TYPE.SUM,
      field: 'myField',
    },
  ],
  fields: [],
  onChange: () => {},
  allowMultipleMetrics: true,
  metricsFilter: () => {},
};

test('should render metrics editor', async () => {
  const component = shallow(<MetricsEditor {...defaultProps} />);
  expect(component).toMatchSnapshot();
});

test('should add default count metric when metrics is empty array', async () => {
  const component = shallow(<MetricsEditor {...defaultProps} metrics={[]} />);
  expect(component).toMatchSnapshot();
});
