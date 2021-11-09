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
import { render } from '@testing-library/react';

import { useKibana } from '../../../../utils/kibana_react';
import { CASES_OWNER } from '../constants';

jest.mock('../../../../utils/kibana_react');

const onCloseFlyout = jest.fn();
const onSuccess = jest.fn();
const defaultProps = {
  onCloseFlyout,
  onSuccess,
};

describe('CreateCaseFlyout', () => {
  const mockCreateCase = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        cases: {
          getCreateCase: mockCreateCase,
        },
      },
    });
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

    wrapper.find(`[data-test-subj='euiFlyoutCloseButton']`).first().simulate('click');
    expect(onCloseFlyout).toBeCalled();
  });

  it('does not show the sync alerts toggle', () => {
    render(
      <EuiThemeProvider>
        <CreateCaseFlyout {...defaultProps} />
      </EuiThemeProvider>
    );

    expect(mockCreateCase).toBeCalledTimes(1);
    expect(mockCreateCase).toBeCalledWith({
      onCancel: onCloseFlyout,
      onSuccess,
      afterCaseCreated: undefined,
      withSteps: false,
      owner: [CASES_OWNER],
      disableAlerts: true,
    });
  });
});
