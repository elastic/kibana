/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';

import { InventoryGroupAccordion } from './inventory_group_accordion';

describe('Grouped Inventory Accordion', () => {
  it('renders with correct values', () => {
    const props = {
      groupBy: 'entity.type',
      groups: [
        {
          count: 5999,
          'entity.type': 'host',
        },
        {
          count: 2001,
          'entity.type': 'service',
        },
      ],
    };
    render(
      <InventoryGroupAccordion
        groupValue={props.groups[0]['entity.type']}
        groupCount={props.groups[0].count}
        groupBy={props.groupBy}
      />
    );
    expect(screen.getByText(props.groups[0]['entity.type'])).toBeInTheDocument();
    const container = screen.getByTestId('inventoryPanelBadgeEntitiesCount_entity.type_host');
    expect(within(container).getByText('Entities:')).toBeInTheDocument();
    expect(within(container).getByText(props.groups[0].count)).toBeInTheDocument();
  });
});
