/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TestProviders } from '../../../../common/mock';
import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { ManagedUserAccordion } from './managed_user_accordion';
import { mockEntraUser } from './__mocks__';

describe('useManagedUserItems', () => {
  it('it renders children', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ManagedUserAccordion
          openTitle="isOpen"
          closedTitle="isClosed"
          id="123"
          managedUser={mockEntraUser}
        >
          <div data-test-subj="test-children" />
        </ManagedUserAccordion>
      </TestProviders>
    );

    expect(getByTestId('test-children')).toBeInTheDocument();
  });

  it('it renders openTitle when open', () => {
    const { getByText } = render(
      <TestProviders>
        <ManagedUserAccordion
          openTitle="isOpen"
          closedTitle="isClosed"
          id="123"
          managedUser={mockEntraUser}
        >
          <div data-test-subj="test-children" />
        </ManagedUserAccordion>
      </TestProviders>
    );

    expect(getByText('isOpen')).toBeInTheDocument();
  });

  it('it renders closeTitle when closed', async () => {
    const { getByText, getAllByRole } = render(
      <TestProviders>
        <ManagedUserAccordion
          openTitle="isOpen"
          closedTitle="isClosed"
          id="123"
          managedUser={mockEntraUser}
        >
          <div data-test-subj="test-children" />
        </ManagedUserAccordion>
      </TestProviders>
    );

    fireEvent.click(getAllByRole('button')[0]);

    expect(getByText('isClosed')).toBeInTheDocument();
  });
});
