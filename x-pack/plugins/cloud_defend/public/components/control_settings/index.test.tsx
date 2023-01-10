/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestProvider } from '../../test/test_provider';
import { getCloudDefendNewPolicyMock } from '../../test/mocks';
import { ControlSettings } from '.';

describe('<ControlSettings />', () => {
  const onChange = jest.fn();
  const WrappedComponent = ({ policy = getCloudDefendNewPolicyMock() }) => {
    return (
      <TestProvider>
        <ControlSettings policy={policy} onChange={onChange} />;
      </TestProvider>
    );
  };

  beforeEach(() => {
    onChange.mockClear();
  });

  it('renders a toggle to switch between yaml and general views', () => {
    const { getByTestId } = render(<WrappedComponent />);
    let el = getByTestId('cloud-defend-btngeneralview');
    expect(el).toBeInTheDocument();
    el = getByTestId('cloud-defend-btnyamlview');
    expect(el).toBeInTheDocument();
  });

  it('renders a yaml editor when the user switches to yaml view', async () => {
    render(<WrappedComponent />);
    userEvent.click(screen.getByText('YAML view'));

    await waitFor(() => expect(screen.getByTestId('monacoEditorTextarea')).toBeTruthy());
  });

  it('renders a friendly UI when the user switches to general view', async () => {
    render(<WrappedComponent />);
    userEvent.click(screen.getByText('General view'));

    await waitFor(() => expect(screen.findByTestId('cloud-defend-generalview')).toBeTruthy());
  });
});
