/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { shallow } from 'enzyme';
import { LensFieldIcon } from './lens_field_icon';

test('LensFieldIcon renders properly', () => {
  const component = shallow(<LensFieldIcon type={'date'} />);
  expect(component).toMatchSnapshot();
});

test('LensFieldIcon accepts FieldIcon props', () => {
  const component = shallow(<LensFieldIcon type={'date'} fill={'none'} />);
  expect(component).toMatchSnapshot();
});
