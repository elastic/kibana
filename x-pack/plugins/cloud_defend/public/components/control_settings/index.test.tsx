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
import { coreMock } from '@kbn/core/public/mocks';

describe('<ControlSettings />', () => {
  const onChange = jest.fn();

  // defining this here to avoid a warning in testprovider with params.history changing on rerender.
  const params = coreMock.createAppMountParameters();

  const WrappedComponent = ({ policy = getCloudDefendNewPolicyMock() }) => {
    return (
      <TestProvider params={params}>
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

  it('should prevent ability to switch views if there are errors', async () => {
    const { rerender, getAllByTestId } = render(<WrappedComponent />);

    const btnClear = await waitFor(() => getAllByTestId('comboBoxClearButton')[0]);

    userEvent.click(btnClear);

    const updated = onChange.mock.calls[0][0].updatedPolicy;

    rerender(<WrappedComponent policy={updated} />);

    expect(screen.getByTestId('cloud-defend-btngeneralview')).toBeDisabled();
    expect(screen.getByTestId('cloud-defend-btnyamlview')).toBeDisabled();
  });
});
