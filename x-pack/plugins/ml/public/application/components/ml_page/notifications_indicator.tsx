/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFlexGroup, EuiFlexItem, EuiNotificationBadge } from '@elastic/eui';

export const NotificationsIndicator: FC = () => {
  return (
    <EuiFlexGroup alignItems={'center'} gutterSize={'xs'}>
      <EuiFlexItem grow={false}>
        <FormattedMessage
          id="xpack.ml.navMenu.notificationsTabLinkText"
          defaultMessage="Notifications"
        />
      </EuiFlexItem>
      {false ? (
        <EuiFlexItem grow={false}>
          <EuiNotificationBadge>{0}</EuiNotificationBadge>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};
