/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import 'jest-styled-components';
import * as React from 'react';

import { SelectableText } from '.';

describe('SelectableText', () => {
  test('renders correctly against snapshot', () => {
    const wrapper = shallow(<SelectableText>You may select this text</SelectableText>);
    expect(toJson(wrapper)).toMatchSnapshot();
  });

  test('it applies the user-select: text style', () => {
    const wrapper = mount(<SelectableText>You may select this text</SelectableText>);

    expect(wrapper).toHaveStyleRule('user-select', 'text');
  });
});
