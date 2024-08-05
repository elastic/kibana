/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { Actions } from '.';
import { TestProviders } from '../../../common/mock';
import { mockAttackDiscovery } from '../../mock/mock_attack_discovery';
import { ATTACK_CHAIN, ALERTS } from './translations';

describe('Actions', () => {
  beforeEach(() =>
    render(
      <TestProviders>
        <Actions attackDiscovery={mockAttackDiscovery} />
      </TestProviders>
    )
  );

  it('renders the attack chain label', () => {
    expect(screen.getByTestId('attackChainLabel')).toHaveTextContent(ATTACK_CHAIN);
  });

  it('renders the mini attack chain component', () => {
    expect(screen.getByTestId('miniAttackChain')).toBeInTheDocument();
  });

  it('renders the alerts label', () => {
    expect(screen.getByTestId('alertsLabel')).toHaveTextContent(ALERTS);
  });

  it('renders the alerts badge with the expected count', () => {
    expect(screen.getByTestId('alertsBadge')).toHaveTextContent(
      `${mockAttackDiscovery.alertIds.length}`
    );
  });

  it('renders the take action dropdown', () => {
    expect(screen.getByTestId('takeAction')).toBeInTheDocument();
  });
});
