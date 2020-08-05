/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { DisabledLoginForm } from './disabled_login_form';

describe('DisabledLoginForm', () => {
  it('renders as expected', () => {
    expect(
      shallow(<DisabledLoginForm title={'disabled message title'} message={'disabled message'} />)
    ).toMatchSnapshot();
  });
});
