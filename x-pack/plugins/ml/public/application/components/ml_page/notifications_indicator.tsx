/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiNotificationBadge,
  EuiToolTip,
} from '@elastic/eui';
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import { useFieldFormatter } from '../../contexts/kibana/use_field_formatter';
import { useMlNotifications } from '../../contexts/ml/ml_notifications_context';

export const NotificationsIndicator: FC = () => {
  const { notificationsCounts, latestRequestedAt } = useMlNotifications();
  const dateFormatter = useFieldFormatter(FIELD_FORMAT_IDS.DATE);

  const errorsAndWarningCount =
    (notificationsCounts?.error ?? 0) + (notificationsCounts?.warning ?? 0);
  const hasUnread = notificationsCounts && Object.values(notificationsCounts).some((v) => v > 0);

  return (
    <EuiFlexGroup alignItems={'center'} gutterSize={'s'}>
      <EuiFlexItem grow={false}>
        <FormattedMessage
          id="xpack.ml.navMenu.notificationsTabLinkText"
          defaultMessage="Notifications"
        />
      </EuiFlexItem>
      {errorsAndWarningCount ? (
        <EuiFlexItem grow={false}>
          <EuiToolTip
            position="right"
            content={
              <FormattedMessage
                id="xpack.ml.notificationsIndicator.errorsAndWarningLabel"
                defaultMessage="There {count, plural, one {is # notification} other {are # notifications}} with error or warning level since {lastCheckedAt}"
                values={{
                  count: errorsAndWarningCount,
                  lastCheckedAt: dateFormatter(latestRequestedAt),
                }}
              />
            }
          >
            <EuiNotificationBadge
              aria-label={i18n.translate('xpack.ml.notificationsIndicator.unreadErrors', {
                defaultMessage: 'Unread errors or warnings indicator.',
              })}
              data-test-subj={'mlNotificationErrorsIndicator'}
            >
              {errorsAndWarningCount}
            </EuiNotificationBadge>
          </EuiToolTip>
        </EuiFlexItem>
      ) : null}
      {!errorsAndWarningCount && hasUnread ? (
        <EuiFlexItem grow={false}>
          <EuiToolTip
            position="right"
            content={
              <FormattedMessage
                id="xpack.ml.notificationsIndicator.unreadLabel"
                defaultMessage="You have unread notifications since {lastCheckedAt}"
                values={{ lastCheckedAt: dateFormatter(latestRequestedAt) }}
              />
            }
          >
            <EuiHealth
              css={{ display: 'block' }}
              color="primary"
              role="img"
              aria-label={i18n.translate('xpack.ml.notificationsIndicator.unreadIcon', {
                defaultMessage: 'Unread notifications indicator.',
              })}
              data-test-subj={'mlNotificationsIndicator'}
            />
          </EuiToolTip>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};
