/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiNotificationBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useContainerState } from '../../../../../../../../src/plugins/kibana_utils/public';
import { EnhancedEmbeddableContext } from '../../../../../../embeddable_enhanced/public';
import { txtDisplayName } from './i18n';

export const MenuItem: React.FC<{ context: EnhancedEmbeddableContext }> = ({ context }) => {
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
