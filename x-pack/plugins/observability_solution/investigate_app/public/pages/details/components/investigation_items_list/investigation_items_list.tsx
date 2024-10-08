/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { pick } from 'lodash';
import React from 'react';
import { useInvestigation } from '../../contexts/investigation_context';
import { GridItem } from '../grid_item';

export function InvestigationItemsList() {
  const { renderableItems, addItem, deleteItem, isAddingItem, isDeletingItem } = useInvestigation();

  if (!renderableItems.length) {
    return null;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      {renderableItems.map((item) => {
        return (
          <EuiFlexItem grow={false} key={`item-${item.id}`}>
            <GridItem
              id={item.id}
              title={item.title}
              loading={item.loading || isAddingItem || isDeletingItem}
              onCopy={async () => {
                await addItem(pick(item, ['title', 'type', 'params']));
              }}
              onDelete={async () => {
                await deleteItem(item.id);
              }}
            >
              {item.element}
            </GridItem>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
}
