/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { GridItem } from '../grid_item';
import './styles.scss';

export interface InvestigateWidgetGridItem {
  id: string;
  title: string;
  element: React.ReactNode;
  loading: boolean;
}

interface InvestigateWidgetGridProps {
  items: InvestigateWidgetGridItem[];
  onItemsChange: (items: InvestigateWidgetGridItem[]) => Promise<void>;
  onItemCopy: (item: InvestigateWidgetGridItem) => Promise<void>;
  onItemDelete: (item: InvestigateWidgetGridItem) => Promise<void>;
}

export function InvestigateWidgetGrid({
  items,
  onItemsChange,
  onItemDelete,
  onItemCopy,
}: InvestigateWidgetGridProps) {
  if (!items.length) {
    return null;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      {items.map((item) => {
        return (
          <EuiFlexItem grow={false} key={`item-${item.id}`}>
            <GridItem
              id={item.id}
              title={item.title}
              loading={item.loading}
              onCopy={() => {
                return onItemCopy(item);
              }}
              onDelete={() => {
                return onItemDelete(item);
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
