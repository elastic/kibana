/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiNotificationBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useContainerState } from '@kbn/kibana-utils-plugin/public';
import { EnhancedEmbeddableContext } from '@kbn/embeddable-enhanced-plugin/public';
import { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import { txtDisplayName } from './i18n';

export const MenuItem: React.FC<{ context: ActionExecutionContext<EnhancedEmbeddableContext> }> = ({
  context,
}) => {
  const { events } = useContainerState(context.embeddable.enhancements.dynamicActions.state);
  const count = events.length;

  return (
    <EuiFlexGroup alignItems={'center'}>
      <EuiFlexItem grow={true}>{txtDisplayName}</EuiFlexItem>
      {count > 0 && (
        <EuiFlexItem grow={false}>
          <EuiNotificationBadge>{count}</EuiNotificationBadge>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
