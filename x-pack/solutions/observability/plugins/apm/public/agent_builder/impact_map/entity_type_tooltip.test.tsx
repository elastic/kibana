/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EntityTypeTooltip } from './entity_type_tooltip';

describe('EntityTypeTooltip', () => {
  it('omits sub-type when it matches type', async () => {
    const user = userEvent.setup();
    render(
      <EntityTypeTooltip typeKindLabel="Service" subtypeLabel="Service">
        <span>node</span>
      </EntityTypeTooltip>
    );
    await user.hover(screen.getByTestId('impactMapEntityTypeTooltip'));
    expect(await screen.findByText('Type: Service')).toBeInTheDocument();
    expect(screen.queryByText(/Sub-type:/)).not.toBeInTheDocument();
  });

  it('shows sub-type when it differs from type', async () => {
    const user = userEvent.setup();
    render(
      <EntityTypeTooltip typeKindLabel="Infrastructure" subtypeLabel="Host">
        <span>node</span>
      </EntityTypeTooltip>
    );
    await user.hover(screen.getByTestId('impactMapEntityTypeTooltip'));
    expect(await screen.findByText('Type: Infrastructure')).toBeInTheDocument();
    expect(await screen.findByText('Sub-type: Host')).toBeInTheDocument();
  });
});
