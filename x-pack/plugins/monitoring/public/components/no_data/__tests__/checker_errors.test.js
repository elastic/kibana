/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { wrap, forbidden } from 'boom';
import { render } from 'enzyme';
import { CheckerErrors } from '../checker_errors';

describe('CheckerErrors', () => {
  test('should render nothing if errors is empty', () => {
    const component = render(<CheckerErrors errors={[]} />);
    expect(component).toMatchSnapshot();
  });

  test('should render typical boom errors from api response', () => {
    const err1 = forbidden(new Error('no access for you'));
    const err2 = wrap(new Error('bad thing happened'));
    const errors = [err1, err2].map(err => err.output.payload);
    const component = render(<CheckerErrors errors={errors} />);
    expect(component).toMatchSnapshot();
  });
});
