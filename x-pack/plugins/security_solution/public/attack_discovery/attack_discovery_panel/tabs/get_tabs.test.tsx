/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Replacements } from '@kbn/elastic-assistant-common';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { getTabs } from './get_tabs';
import { TestProviders } from '../../../common/mock';
import { mockAttackDiscovery } from '../../mock/mock_attack_discovery';
import { ALERTS, ATTACK_DISCOVERY } from './translations';

describe('getTabs', () => {
  const mockReplacements: Replacements = {
    '5e454c38-439c-4096-8478-0a55511c76e3': 'foo.hostname',
    '3bdc7952-a334-4d95-8092-cd176546e18a': 'bar.username',
  };

  const tabs = getTabs({
    attackDiscovery: mockAttackDiscovery,
    replacements: mockReplacements,
  });

  describe('Attack discovery tab', () => {
    const attackDiscoveryTab = tabs.find((tab) => tab.id === 'attackDiscovery--id');

    it('includes the Attack discovery tab', () => {
      expect(attackDiscoveryTab).not.toBeUndefined();
    });

    it('has the expected tab name', () => {
      expect(attackDiscoveryTab?.name).toEqual(ATTACK_DISCOVERY);
    });

    it('renders the expected content', () => {
      render(<TestProviders>{attackDiscoveryTab?.content}</TestProviders>);

      expect(screen.getByTestId('attackDiscoveryTab')).toBeInTheDocument();
    });
  });

  describe('Alerts tab', () => {
    const alertsTab = tabs.find((tab) => tab.id === 'alerts--id');

    it('includes the Alerts tab', () => {
      expect(alertsTab).not.toBeUndefined();
    });

    it('has the expected tab name', () => {
      expect(alertsTab?.name).toEqual(ALERTS);
    });

    it('renders the expected content', () => {
      render(<TestProviders>{alertsTab?.content}</TestProviders>);

      expect(screen.getByTestId('alertsTab')).toBeInTheDocument();
    });
  });
});
