/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { AlertCallOut } from './alert_call_out';

describe('AlertCallOut component', () => {
  it('renders expected component', () => {
    const wrapper = shallow(
      <AlertCallOut>
        <div>Some text</div>
      </AlertCallOut>
    );
    expect(wrapper).toMatchSnapshot();
  });
});
