/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { shallow } from 'enzyme';
import React from 'react';

import { Overrides } from './overrides';

describe('Overrides', () => {

  test('render overrides', () => {
    const props = {
      setOverrides: () => {},
      overrides: {},
      defaultSettings: {},
      setApplyOverrides: () => {},
      fields: [],
    };

    const component = shallow(
      <Overrides {...props} />
    );

    expect(component).toMatchSnapshot();
  });
});
