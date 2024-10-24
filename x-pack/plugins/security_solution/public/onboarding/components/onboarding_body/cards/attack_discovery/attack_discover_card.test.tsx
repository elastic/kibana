/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { AttackDiscoveryCard } from './attack_discovery_card';
import { TestProviders } from '../../../../../common/mock';

const props = {
  setComplete: jest.fn(),
  checkComplete: jest.fn(),
  isCardComplete: jest.fn(),
  setExpandedCardId: jest.fn(),
};

describe('RulesCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('description should be in the document', () => {
    const { getByTestId } = render(
      <TestProviders>
        <AttackDiscoveryCard {...props} />
      </TestProviders>
    );

    expect(getByTestId('attackDiscoveryCardDescription')).toBeInTheDocument();
  });

  it('card callout should be rendered if integrations cards is not complete', () => {
    props.isCardComplete.mockReturnValueOnce(false);

    const { getByText } = render(
      <TestProviders>
        <AttackDiscoveryCard {...props} />
      </TestProviders>
    );

    expect(getByText('To use Attack Discovery add integrations first.')).toBeInTheDocument();
  });

  it('card button should be disabled if integrations cards is not complete', () => {
    props.isCardComplete.mockReturnValueOnce(false);

    const { getByTestId } = render(
      <TestProviders>
        <AttackDiscoveryCard {...props} />
      </TestProviders>
    );

    expect(getByTestId('attackDiscoveryCardButton').querySelector('button')).toBeDisabled();
  });
});
