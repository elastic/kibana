/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


<<<<<<< HEAD
import { shallow } from 'enzyme';
=======
import { mount, shallow } from 'enzyme';
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
import React from 'react';

import { Overrides } from './overrides';

<<<<<<< HEAD
describe('Overrides', () => {

  test('render overrides', () => {
    const props = {
      setOverrides: () => {},
      overrides: {},
      originalSettings: {},
      defaultSettings: {},
      setApplyOverrides: () => {},
      fields: [],
    };
=======
function getProps() {
  return {
    setOverrides: () => { },
    overrides: {},
    originalSettings: {},
    defaultSettings: {},
    setApplyOverrides: () => { },
    fields: [],
  };
}

describe('Overrides', () => {

  test('render overrides', () => {
    const props = getProps();
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1

    const component = shallow(
      <Overrides {...props} />
    );

    expect(component).toMatchSnapshot();
  });
<<<<<<< HEAD
=======

  test('render overrides and trigger a state change', () => {
    const FORMAT_1 = 'delimited';
    const FORMAT_2 = 'ndjson';

    const props = getProps();
    props.overrides.format = FORMAT_1;

    const component = mount(
      <Overrides {...props} />
    );

    expect(component.state('format')).toEqual(FORMAT_1);

    component.instance().onFormatChange(FORMAT_2);

    expect(component.state('format')).toEqual(FORMAT_2);

  });
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
});
