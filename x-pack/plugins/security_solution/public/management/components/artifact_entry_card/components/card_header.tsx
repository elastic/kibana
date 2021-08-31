/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { DateFieldValue } from './date_field_value';
import { ActionsContextMenu, ActionsContextMenuProps } from '../../actions_context_menu';

export const CardHeader = memo<{
  name: string;
  createdDate: string;
  updatedDate: string;
  /** If defined, then an overflow menu will be shown with the actions provided */
  actions?: ActionsContextMenuProps['items'];
}>(({ name, createdDate, updatedDate, actions }) => {
  return (
    <EuiFlexGroup responsive={false}>
      <EuiFlexItem grow={true}>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={true}>
            <EuiTitle size="s">
              <h3>{name}</h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup responsive={false}>
              <EuiFlexItem grow={false}>
                <DateFieldValue date={updatedDate} type="update" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <DateFieldValue date={createdDate} type="create" />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      {actions && actions.length > 0 && (
        <EuiFlexItem grow={false}>
          <ActionsContextMenu items={actions} icon="boxesVertical" />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
});

CardHeader.displayName = 'CardHeader';
