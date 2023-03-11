/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestProvider } from '../../test/test_provider';
import { getCloudDefendNewPolicyMock } from '../../test/mocks';
import { PolicySettings } from '.';
import { getInputFromPolicy } from '../../common/utils';
import { INPUT_CONTROL } from '../../../common/constants';

describe('<PolicySettings />', () => {
  const onChange = jest.fn();

  const WrappedComponent = ({ policy = getCloudDefendNewPolicyMock() }) => {
    return (
      <TestProvider>
        <PolicySettings policy={policy} onChange={onChange} />;
      </TestProvider>
    );
  };

  beforeEach(() => {
    onChange.mockClear();
  });

  it('renders a checkbox to toggle BPF/LSM control mechanism', () => {
    const { getByTestId } = render(<WrappedComponent />);
    const input = getByTestId('cloud-defend-controltoggle');
    expect(input).toBeInTheDocument();
    expect(input).toBeEnabled();
  });

  it('User can disable control features', async () => {
    const { getByTestId } = render(<WrappedComponent />);

    userEvent.click(getByTestId('cloud-defend-controltoggle'));

    const policy = onChange.mock.calls[0][0].updatedPolicy;
    const controlInput = getInputFromPolicy(policy, INPUT_CONTROL);

    expect(controlInput?.enabled).toBeFalsy();
  });
});
