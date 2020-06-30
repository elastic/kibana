/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { renderWithIntl, shallowWithIntl } from 'test_utils/enzyme_helpers';
import { TimeExpressionSelect } from '../time_expression_select';

describe('TimeExpressionSelect component', () => {
  it('should shallow renders against props', function () {
    const component = shallowWithIntl(<TimeExpressionSelect setAlertParams={jest.fn()} />);
    expect(component).toMatchSnapshot();
  });

  it('should renders against props', function () {
    const component = renderWithIntl(<TimeExpressionSelect setAlertParams={jest.fn()} />);
    expect(component).toMatchSnapshot();
  });
});
