/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiNotificationBadge,
  EuiToolTip,
} from '@elastic/eui';
import { combineLatest, of, timer } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import moment from 'moment';
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import { useFieldFormatter } from '../../contexts/kibana/use_field_formatter';
import { useAsObservable } from '../../hooks';
import { NotificationsCountResponse } from '../../../../common/types/notifications';
import { useMlKibana } from '../../contexts/kibana';
import { useStorage } from '../../contexts/storage';
import { ML_NOTIFICATIONS_LAST_CHECKED_AT } from '../../../../common/types/storage';

const NOTIFICATIONS_CHECK_INTERVAL = 60000;

export const NotificationsIndicator: FC = () => {
  const {
    services: {
      mlServices: { mlApiServices },
    },
  } = useMlKibana();
  const dateFormatter = useFieldFormatter(FIELD_FORMAT_IDS.DATE);

  const [lastCheckedAt] = useStorage(ML_NOTIFICATIONS_LAST_CHECKED_AT);
  const lastCheckedAt$ = useAsObservable(lastCheckedAt);

  /** Holds the value used for the actual request */
  const [lastCheckRequested, setLastCheckRequested] = useState<number>();
  const [notificationsCounts, setNotificationsCounts] = useState<NotificationsCountResponse>();

  useEffect(function startPollingNotifications() {
    const subscription = combineLatest([lastCheckedAt$, timer(0, NOTIFICATIONS_CHECK_INTERVAL)])
      .pipe(
        switchMap(([lastChecked]) => {
          const lastCheckedAtQuery = lastChecked ?? moment().subtract(7, 'd').valueOf();
          setLastCheckRequested(lastCheckedAtQuery);
          // Use the latest check time or 7 days ago by default.
          return mlApiServices.notifications.countMessages$({
            lastCheckedAt: lastCheckedAtQuery,
          });
        }),
        catchError((error) => {
          // Fail silently for now
          return of({} as NotificationsCountResponse);
        })
      )
      .subscribe((response) => {
        setNotificationsCounts(response);
      });

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
                  lastCheckedAt: dateFormatter(lastCheckRequested),
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
                values={{ lastCheckedAt: dateFormatter(lastCheckRequested) }}
              />
            }
          >
            <EuiHealth
              css={{ display: 'block' }}
              color="primary"
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
