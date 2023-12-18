/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { ObservedEntity } from '.';
import { TestProviders } from '../../../../common/mock';
import { mockObservedHostData } from '../../../../timelines/components/side_panel/new_host_detail/__mocks__';

describe('ObservedHost', () => {
  const mockProps = {
    observedData: mockObservedHostData,
    contextID: '',
    scopeId: '',
    isDraggable: false,
    queryId: 'TEST_QUERY_ID',
    observedFields: [],
  };

  it('renders', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ObservedEntity {...mockProps} />
      </TestProviders>
    );

    expect(getByTestId('observedEntity-data')).toBeInTheDocument();
  });

  it('renders the formatted date', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ObservedEntity {...mockProps} />
      </TestProviders>
    );

    expect(getByTestId('observedEntity-data')).toHaveTextContent('Updated Feb 23, 2023');
  });

  it('renders anomaly score', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ObservedEntity {...mockProps} />
      </TestProviders>
    );

    expect(getByTestId('anomaly-score')).toHaveTextContent('17');
  });
});
