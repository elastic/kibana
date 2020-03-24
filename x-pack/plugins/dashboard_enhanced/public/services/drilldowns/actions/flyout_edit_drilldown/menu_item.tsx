/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiNotificationBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { EmbeddableContext } from '../../../../../../../../src/plugins/embeddable/public';
import { txtDisplayName } from './i18n';
import { useContainerState } from '../../../../../../../../src/plugins/kibana_utils/common';

export const MenuItem: React.FC<{ context: EmbeddableContext }> = ({ context }) => {
  if (!context.embeddable.dynamicActions)
    throw new Error('Flyout edit drillldown context menu item requires `dynamicActions`');

  const { events } = useContainerState(context.embeddable.dynamicActions.state);
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
