/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallowWithIntl } from '@kbn/test-jest-helpers';
import React from 'react';

import { EditDescriptionPopover } from './edit_description_popover';

function prepareTest(updateDescriptionFn) {
  const props = {
    description: 'A list of known safe domains',
    updateDescription: updateDescriptionFn,
    canCreateFilter: true,
  };

  const wrapper = shallowWithIntl(<EditDescriptionPopover {...props} />);

  return wrapper;
}

describe('FilterListUsagePopover', () => {
  test('renders the popover with no description', () => {
    const updateDescription = jest.fn(() => {});

    const props = {
      updateDescription,
      canCreateFilter: true,
    };

    const component = shallowWithIntl(<EditDescriptionPopover {...props} />);

    expect(component).toMatchSnapshot();
  });

  test('renders the popover with a description', () => {
    const updateDescription = jest.fn(() => {});
    const wrapper = prepareTest(updateDescription);
    expect(wrapper).toMatchSnapshot();
  });

  test('opens the popover onButtonClick', () => {
    const updateDescription = jest.fn(() => {});
    const wrapper = prepareTest(updateDescription);
    const instance = wrapper.instance();
    instance.onButtonClick();
    wrapper.update();
    expect(wrapper).toMatchSnapshot();
  });

  test('calls updateDescription on closing', () => {
    const updateDescription = jest.fn(() => {});
    const wrapper = prepareTest(updateDescription);
    const instance = wrapper.instance();
    instance.onButtonClick();
    instance.closePopover();
    wrapper.update();
    expect(updateDescription).toHaveBeenCalled();
  });
});
