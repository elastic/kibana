/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { EuiThemeProvider } from '../../../../../../../../src/plugins/kibana_react/common';

import { CreateCaseFlyout } from './flyout';

jest.mock('../../../../utils/kibana_react', () => ({
  useKibana: () => ({
    services: {
      cases: {
        getCreateCase: jest.fn(),
      },
    },
  }),
}));
const onCloseFlyout = jest.fn();
const onSuccess = jest.fn();
const defaultProps = {
  onCloseFlyout,
  onSuccess,
};

describe('CreateCaseFlyout', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renders', () => {
    const wrapper = mount(
      <EuiThemeProvider>
        <CreateCaseFlyout {...defaultProps} />
      </EuiThemeProvider>
    );

    expect(wrapper.find(`[data-test-subj='create-case-flyout']`).exists()).toBeTruthy();
  });

  it('Closing modal calls onCloseCaseModal', () => {
    const wrapper = mount(
      <EuiThemeProvider>
        <CreateCaseFlyout {...defaultProps} />
      </EuiThemeProvider>
    );

    wrapper.find('.euiFlyout__closeButton').first().simulate('click');
    expect(onCloseFlyout).toBeCalled();
  });
});
