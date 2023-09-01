/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../../common/mock';
import { mockObservedUser } from './__mocks__';
import { ObservedUser } from './observed_user';

describe('ObservedUser', () => {
  const mockProps = {
    observedUser: mockObservedUser,
    contextID: '',
    scopeId: '',
    isDraggable: false,
  };

  it('renders', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ObservedUser {...mockProps} />
      </TestProviders>
    );

    expect(getByTestId('observedUser-data')).toBeInTheDocument();
  });

  it('updates the accordion button title when visibility toggles', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ObservedUser {...mockProps} />
      </TestProviders>
    );
    const accordionButton = getByTestId('observedUser-accordion-button');

    expect(accordionButton).toHaveTextContent('Show observed data');
    fireEvent.click(accordionButton);
    expect(accordionButton).toHaveTextContent('Hide observed data');
  });

  it('renders the formatted date', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ObservedUser {...mockProps} />
      </TestProviders>
    );

    expect(getByTestId('observedUser-data')).toHaveTextContent('Updated Feb 23, 2023');
  });

  it('renders anomaly score', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ObservedUser {...mockProps} />
      </TestProviders>
    );

    expect(getByTestId('anomaly-score')).toHaveTextContent('17');
  });
});
