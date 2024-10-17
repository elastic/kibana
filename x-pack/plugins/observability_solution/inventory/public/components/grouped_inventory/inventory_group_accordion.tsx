/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { EuiAccordion, EuiSpacer } from '@elastic/eui';
import { InventoryGroupPanel } from './inventory_group_panel';
import { GroupedGridWrapper } from './grouped_grid_wrapper';
import { EntityGroup } from '../../../common/entities';

export interface InventoryGroupAccordionProps {
  group: EntityGroup;
  groupBy: string;
}

export function InventoryGroupAccordion({ group, groupBy }: InventoryGroupAccordionProps) {
  const field = group[groupBy];
  const id = `inventory-group-${groupBy}-${field}`;
  const [load, setLoad] = useState(false);

  return (
    <>
      <EuiAccordion
        className="inventoryGroupAccordion"
        data-test-subj={id}
        id={id}
        buttonContent={<InventoryGroupPanel field={field} entities={group.count} />}
        buttonElement="div"
        buttonProps={{ paddingSize: 'm' }}
        paddingSize="m"
        onToggle={() => setLoad(true)}
      >
        {load && <GroupedGridWrapper field={field} />}
      </EuiAccordion>
      <EuiSpacer size="s" />
    </>
  );
}
