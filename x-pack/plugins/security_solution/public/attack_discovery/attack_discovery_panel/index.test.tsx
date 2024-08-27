/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { AttackDiscoveryPanel } from '.';
import { TestProviders } from '../../common/mock';
import { mockAttackDiscovery } from '../mock/mock_attack_discovery';

describe('AttackDiscoveryPanel', () => {
  it('renders the attack discovery accordion', () => {
    render(
      <TestProviders>
        <AttackDiscoveryPanel attackDiscovery={mockAttackDiscovery} />
      </TestProviders>
    );

    const attackDiscoveryAccordion = screen.getByTestId('attackDiscoveryAccordion');

    expect(attackDiscoveryAccordion).toBeInTheDocument();
  });

  it('renders empty accordion content', () => {
    render(
      <TestProviders>
        <AttackDiscoveryPanel attackDiscovery={mockAttackDiscovery} />
      </TestProviders>
    );

    const emptyAccordionContent = screen.getByTestId('emptyAccordionContent');

    expect(emptyAccordionContent).toBeInTheDocument();
  });

  it('renders the attack discovery summary', () => {
    render(
      <TestProviders>
        <AttackDiscoveryPanel attackDiscovery={mockAttackDiscovery} />
      </TestProviders>
    );

    const actionableSummary = screen.getByTestId('actionableSummary');

    expect(actionableSummary).toBeInTheDocument();
  });

  it('renders the attack discovery tabs panel when accordion is open', () => {
    render(
      <TestProviders>
        <AttackDiscoveryPanel attackDiscovery={mockAttackDiscovery} initialIsOpen={true} />
      </TestProviders>
    );

    const attackDiscoveryTabsPanel = screen.getByTestId('attackDiscoveryTabsPanel');

    expect(attackDiscoveryTabsPanel).toBeInTheDocument();
  });
});
