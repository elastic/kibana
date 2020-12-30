/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('../../../../../kibana_services', () => {
  return {
    getIsDarkMode() {
      return false;
    },
  };
});

jest.mock('../../symbol_utils', () => {
  return {
    SYMBOL_OPTIONS: [
      { value: 'symbol1', label: 'symbol1' },
      { value: 'symbol2', label: 'symbol2' },
    ],
  };
});

import React from 'react';
import { shallow } from 'enzyme';

import { IconSelect } from './icon_select';

test('Should render icon select', () => {
  const component = shallow(<IconSelect value={'symbol1'} onChange={() => {}} />);

  expect(component).toMatchSnapshot();
});
