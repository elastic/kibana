/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { IconSelect } from './icon_select';

const symbolOptions = [
  { value: 'symbol1', label: 'symbol1' },
  { value: 'symbol2', label: 'symbol2' },
];

test('Should render icon select', () => {
  const component = shallow(
    <IconSelect
      value={symbolOptions[0].value}
      onChange={() => {}}
      symbolOptions={symbolOptions}
      isDarkMode={false}
    />
  );

  expect(component).toMatchSnapshot();
});
