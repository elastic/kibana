/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { Upgrade } from '.';
import { TestProviders } from '../../../common/mock';
import {
  ATTACK_DISCOVERY_IS_AVAILABLE,
  FIND_POTENTIAL_ATTACKS_WITH_AI,
  PLEASE_UPGRADE,
} from './translations';

describe('Upgrade', () => {
  beforeEach(() => {
    render(
      <TestProviders>
        <Upgrade />
      </TestProviders>
    );
  });

  it('renders the assistant avatar', () => {
    const assistantAvatar = screen.getByTestId('assistantAvatar');

    expect(assistantAvatar).toBeInTheDocument();
  });

  it('renders the expected upgrade title', () => {
    const upgradeTitle = screen.getByTestId('upgradeTitle');

    expect(upgradeTitle).toHaveTextContent(FIND_POTENTIAL_ATTACKS_WITH_AI);
  });

  it('renders the attack discovery availability text', () => {
    const attackDiscoveryIsAvailable = screen.getByTestId('attackDiscoveryIsAvailable');

    expect(attackDiscoveryIsAvailable).toHaveTextContent(ATTACK_DISCOVERY_IS_AVAILABLE);
  });

  it('renders the please upgrade text', () => {
    const pleaseUpgrade = screen.getByTestId('pleaseUpgrade');

    expect(pleaseUpgrade).toHaveTextContent(PLEASE_UPGRADE);
  });

  it('renders the upgrade subscription plans (docs) link', () => {
    const upgradeDocs = screen.getByRole('link', { name: 'Subscription plans' });

    expect(upgradeDocs).toBeInTheDocument();
  });

  it('renders the upgrade Manage license call to action', () => {
    const upgradeCta = screen.getByRole('link', { name: 'Manage license' });

    expect(upgradeCta).toBeInTheDocument();
  });
});
