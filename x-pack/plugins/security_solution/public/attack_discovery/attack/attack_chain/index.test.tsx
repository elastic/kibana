/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { getTacticMetadata } from '../../helpers';
import { AttackChain } from '.';

import { mockAttackDiscovery } from '../../mock/mock_attack_discovery';

describe('AttackChain', () => {
  it('renders the expected tactics', () => {
    // get detected tactics from the attack discovery:
    const tacticMetadata = getTacticMetadata(mockAttackDiscovery).filter(
      (tactic) => tactic.detected
    );
    expect(tacticMetadata.length).toBeGreaterThan(0); // test pre-condition

    render(<AttackChain attackDiscovery={mockAttackDiscovery} />);

    tacticMetadata?.forEach((tactic) => {
      expect(screen.getByText(tactic.name)).toBeInTheDocument();
    });
  });
});
