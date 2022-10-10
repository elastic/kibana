/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { CommonProps } from '@elastic/eui';
import { EuiFlexItem } from '@elastic/eui';
import type { ActionsContextMenuProps } from '../../actions_context_menu';
import { ActionsContextMenu } from '../../actions_context_menu';

export interface CardActionsFlexItemProps extends Pick<CommonProps, 'data-test-subj'> {
  /** If defined, then an overflow menu will be shown with the actions provided */
  actions?: ActionsContextMenuProps['items'];
}

export const CardActionsFlexItem = memo<CardActionsFlexItemProps>(
  ({ actions, 'data-test-subj': dataTestSubj }) => {
    return actions && actions.length > 0 ? (
      <EuiFlexItem grow={false}>
        <ActionsContextMenu items={actions} icon="boxesHorizontal" data-test-subj={dataTestSubj} />
      </EuiFlexItem>
    ) : null;
  }
);
CardActionsFlexItem.displayName = 'CardActionsFlexItem';
