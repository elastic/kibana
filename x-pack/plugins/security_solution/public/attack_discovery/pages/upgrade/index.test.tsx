/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { Upgrade } from '.';
import { ProductTier } from '../../../common/components/landing_page/onboarding/configs';
import { TestProviders } from '../../../common/mock';
import {
  ATTACK_DISCOVERY_IS_AVAILABLE,
  FIND_POTENTIAL_ATTACKS_WITH_AI,
  PLEASE_UPGRADE,
  PLEASE_UPGRADE_YOUR_PRODUCT_TIER,
  YOUR_PRODUCT_TIER_DOES_NOT_SUPPORT,
} from './translations';

describe('Upgrade', () => {
  describe('when productTier is undefined', () => {
    beforeEach(() => {
      render(
        <TestProviders>
          <Upgrade productTier={undefined} />
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

    it('renders the self managed attack discovery availability text', () => {
      const attackDiscoveryIsAvailable = screen.getByTestId('attackDiscoveryIsAvailable');

      expect(attackDiscoveryIsAvailable).toHaveTextContent(ATTACK_DISCOVERY_IS_AVAILABLE);
    });

    it('renders the self managed please upgrade text', () => {
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

  describe('when productTier is NOT undefined', () => {
    beforeEach(() => {
      render(
        <TestProviders>
          <Upgrade productTier={ProductTier.essentials} />
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

    it('informs the user the product tier does NOT support attack discovery', () => {
      const attackDiscoveryIsAvailable = screen.getByTestId('attackDiscoveryIsAvailable');

      expect(attackDiscoveryIsAvailable).toHaveTextContent(YOUR_PRODUCT_TIER_DOES_NOT_SUPPORT);
    });

    it('renders text encouraging the user to upgrade the product tier', () => {
      const pleaseUpgrade = screen.getByTestId('pleaseUpgrade');

      expect(pleaseUpgrade).toHaveTextContent(PLEASE_UPGRADE_YOUR_PRODUCT_TIER);
    });

    it('does NOT render the upgrade subscription plans (docs) link', () => {
      const upgradeDocs = screen.queryByRole('link', { name: 'Subscription plans' });

      expect(upgradeDocs).not.toBeInTheDocument();
    });

    it('does NOT render the upgrade Manage license call to action', () => {
      const upgradeCta = screen.queryByRole('link', { name: 'Manage license' });

      expect(upgradeCta).not.toBeInTheDocument();
    });
  });
});
