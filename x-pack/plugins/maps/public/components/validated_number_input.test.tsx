/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { ValidatedNumberInput } from './validated_number_input';

test('should render without error', async () => {
  const component = shallow(
    <ValidatedNumberInput onChange={() => {}} initialValue={10} min={0} max={20} label={'foobar'} />
  );

  expect(component).toMatchSnapshot();
});

test('should render with error', async () => {
  const component = shallow(
    <ValidatedNumberInput onChange={() => {}} initialValue={30} min={0} max={20} label={'foobar'} />
  );

  expect(component).toMatchSnapshot();
});
