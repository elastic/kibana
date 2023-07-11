/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../../common/mock';
import { ManagedUser } from './managed_user';
import { mockManagedUser } from './__mocks__';

describe('ManagedUser', () => {
  const mockProps = {
    managedUser: mockManagedUser,
    contextID: '',
    scopeId: '',
    isDraggable: false,
  };

  it('renders', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ManagedUser {...mockProps} />
      </TestProviders>
    );

    expect(getByTestId('managedUser-data')).toBeInTheDocument();
  });

  it('updates the accordion button title when visibility toggles', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ManagedUser {...mockProps} />
      </TestProviders>
    );
    const accordionButton = getByTestId('managedUser-accordion-button');

    expect(accordionButton).toHaveTextContent('Show Azure AD data');
    fireEvent.click(accordionButton);
    expect(accordionButton).toHaveTextContent('Hide Azure AD data');
  });

  it('renders the formatted date', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ManagedUser {...mockProps} />
      </TestProviders>
    );

    expect(getByTestId('managedUser-data')).toHaveTextContent('Updated Mar 23, 2023');
  });

  it('renders enable integration callout when the integration is disabled', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ManagedUser
          {...{
            ...mockProps,
            managedUser: {
              ...mockManagedUser,
              isIntegrationEnabled: false,
            },
          }}
        />
      </TestProviders>
    );

    expect(getByTestId('managedUser-integration-disable-callout')).toBeInTheDocument();
  });

  it('renders phone number separated by comma', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ManagedUser {...mockProps} />
      </TestProviders>
    );

    expect(getByTestId('managedUser-data')).toHaveTextContent('123456, 654321');
  });

  it('it renders the call out when the integration is disabled', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <ManagedUser
          {...{
            ...mockProps,
            managedUser: { ...mockManagedUser, isIntegrationEnabled: false },
          }}
        />
      </TestProviders>
    );

    expect(queryByTestId('managedUser-integration-disable-callout')).toBeInTheDocument();
  });

  it("it doesn't show the call out when the user is loading", () => {
    const { queryByTestId } = render(
      <TestProviders>
        <ManagedUser
          {...{
            ...mockProps,
            managedUser: { ...mockManagedUser, isLoading: true, isIntegrationEnabled: false },
          }}
        />
      </TestProviders>
    );

    expect(queryByTestId('managedUser-integration-disable-callout')).not.toBeInTheDocument();
  });
});
