/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { getCloudDefendNewPolicyMock } from './mocks';
import { ConfigYamlView } from '.';

describe('<CloudDefendCreatePolicyExtension />', () => {
  const onChange = jest.fn();

  const WrappedComponent = ({ newPolicy = getCloudDefendNewPolicyMock() }) => {
    return <ConfigYamlView policy={newPolicy} onChange={onChange} />;
  };

  beforeEach(() => {
    onChange.mockClear();
  });

  it('renders a checkbox to toggle drift prevention', () => {
    const { getByTestId } = render(<WrappedComponent />);
    const input = getByTestId('cloud-defend-drift-toggle') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input).toBeEnabled();
  });

  it('renders a yaml editor with a default configuration', () => {});

  it('making yaml invalid should show an error highlight', () => {});
});
