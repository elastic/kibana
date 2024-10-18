/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React from 'react';
import { InventoryGroupAccordion } from './inventory_group_accordion';
import { EntityGroup } from '../../../common/entities';

export interface GroupedInventoryPageProps {
  value: { groupBy: string; groups: EntityGroup[] };
}

export function GroupedInventoryView({ value }: GroupedInventoryPageProps) {
  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem grow>
          <EuiSpacer size="m" />
          {value.groups.map((group) => (
            <InventoryGroupAccordion
              key={`${value.groupBy}-${group[value.groupBy]}`}
              group={group}
              groupBy={value.groupBy}
            />
          ))}
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
