/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import type { TacticMetadata } from '../../helpers';
import { getTacticMetadata } from '../../helpers';
import { mockAttackDiscovery } from '../../mock/mock_attack_discovery';
import { MiniAttackChain } from '.';

describe('MiniAttackChain', () => {
  it('displays the expected number of circles', () => {
    // get detected tactics from the attack discovery:
    const tacticMetadata: TacticMetadata[] = getTacticMetadata(mockAttackDiscovery);
    expect(tacticMetadata.length).toBeGreaterThan(0); // test pre-condition

    render(<MiniAttackChain attackDiscovery={mockAttackDiscovery} />);

    const circles = screen.getAllByTestId('circle');

    expect(circles.length).toEqual(tacticMetadata.length);
  });
});
