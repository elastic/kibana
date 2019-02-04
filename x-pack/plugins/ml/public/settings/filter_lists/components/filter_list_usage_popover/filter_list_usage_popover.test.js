/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { shallow } from 'enzyme';
import React from 'react';

import { FilterListUsagePopover } from './filter_list_usage_popover';


function prepareDetectorsTest() {
  const props = {
    entityType: 'detector',
    entityValues: ['mean responsetime', 'max responsetime', 'count']
  };

  const wrapper = shallow(
    <FilterListUsagePopover {...props} />
  );

  return { wrapper };
}

describe('FilterListUsagePopover', () => {

  test('renders the popover for 1 job', () => {
    const props = {
      entityType: 'job',
      entityValues: ['farequote']
    };

    const component = shallow(
      <FilterListUsagePopover {...props} />
    );

    expect(component).toMatchSnapshot();

  });

  test('renders the popover for 2 detectors', () => {
    const test = prepareDetectorsTest();
    expect(test.wrapper).toMatchSnapshot();
  });

  test('opens the popover onButtonClick', () => {
    const test = prepareDetectorsTest();
    const instance = test.wrapper.instance();
    instance.onButtonClick();
    test.wrapper.update();
    expect(test.wrapper).toMatchSnapshot();
  });

});
