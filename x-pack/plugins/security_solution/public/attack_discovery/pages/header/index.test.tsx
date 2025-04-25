/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { Header } from '.';
import { useAssistantAvailability } from '../../../assistant/use_assistant_availability';
import { TestProviders } from '../../../common/mock';

jest.mock('../../../assistant/use_assistant_availability');

describe('Header', () => {
  beforeEach(() => {
    (useAssistantAvailability as jest.Mock).mockReturnValue({
      hasAssistantPrivilege: true,
      isAssistantEnabled: true,
    });
  });

  it('renders the connector selector', () => {
    render(
      <TestProviders>
        <Header
          stats={null}
          connectorId="testConnectorId"
          connectorsAreConfigured={true}
          isDisabledActions={false}
          isLoading={false}
          onCancel={jest.fn()}
          onGenerate={jest.fn()}
          onConnectorIdSelected={jest.fn()}
        />
      </TestProviders>
    );

    const connectorSelector = screen.getByTestId('addNewConnectorButton');

    expect(connectorSelector).toBeInTheDocument();
  });

  it('does NOT render the connector selector when connectors are NOT configured', () => {
    const connectorsAreConfigured = false;

    render(
      <TestProviders>
        <Header
          stats={null}
          connectorId="testConnectorId"
          connectorsAreConfigured={connectorsAreConfigured}
          isDisabledActions={false}
          isLoading={false}
          onCancel={jest.fn()}
          onGenerate={jest.fn()}
          onConnectorIdSelected={jest.fn()}
        />
      </TestProviders>
    );

    const connectorSelector = screen.queryByTestId('addNewConnectorButton');

    expect(connectorSelector).not.toBeInTheDocument();
  });

  it('invokes onGenerate when the generate button is clicked', () => {
    const onGenerate = jest.fn();

    render(
      <TestProviders>
        <Header
          stats={null}
          connectorId="testConnectorId"
          connectorsAreConfigured={true}
          isDisabledActions={false}
          isLoading={false}
          onCancel={jest.fn()}
          onConnectorIdSelected={jest.fn()}
          onGenerate={onGenerate}
        />
      </TestProviders>
    );

    const generate = screen.getByTestId('generate');

    fireEvent.click(generate);

    expect(onGenerate).toHaveBeenCalled();
  });

  it('disables the generate button when the user does NOT have the assistant privilege', () => {
    (useAssistantAvailability as jest.Mock).mockReturnValue({
      hasAssistantPrivilege: false,
      isAssistantEnabled: true,
    });

    render(
      <TestProviders>
        <Header
          stats={null}
          connectorId="testConnectorId"
          connectorsAreConfigured={true}
          isDisabledActions={false}
          isLoading={false}
          onCancel={jest.fn()}
          onConnectorIdSelected={jest.fn()}
          onGenerate={jest.fn()}
        />
      </TestProviders>
    );

    const generate = screen.getByTestId('generate');

    expect(generate).toBeDisabled();
  });

  it('displays the cancel button when loading', () => {
    const isLoading = true;

    render(
      <TestProviders>
        <Header
          stats={null}
          connectorId="testConnectorId"
          connectorsAreConfigured={true}
          isDisabledActions={false}
          isLoading={isLoading}
          onCancel={jest.fn()}
          onConnectorIdSelected={jest.fn()}
          onGenerate={jest.fn()}
        />
      </TestProviders>
    );

    const cancel = screen.getByTestId('cancel');

    expect(cancel).toBeInTheDocument();
  });

  it('invokes onCancel when the cancel button is clicked', () => {
    const isLoading = true;
    const onCancel = jest.fn();

    render(
      <TestProviders>
        <Header
          stats={null}
          connectorId="testConnectorId"
          connectorsAreConfigured={true}
          isDisabledActions={false}
          isLoading={isLoading}
          onCancel={onCancel}
          onConnectorIdSelected={jest.fn()}
          onGenerate={jest.fn()}
        />
      </TestProviders>
    );

    const cancel = screen.getByTestId('cancel');
    fireEvent.click(cancel);

    expect(onCancel).toHaveBeenCalled();
  });

  it('disables the generate button when connectorId is undefined', () => {
    const connectorId = undefined;

    render(
      <TestProviders>
        <Header
          stats={null}
          connectorId={connectorId}
          connectorsAreConfigured={true}
          isDisabledActions={false}
          isLoading={false}
          onCancel={jest.fn()}
          onConnectorIdSelected={jest.fn()}
          onGenerate={jest.fn()}
        />
      </TestProviders>
    );

    const generate = screen.getByTestId('generate');

    expect(generate).toBeDisabled();
  });
});
