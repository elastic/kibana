/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiNotificationBadge, EuiToolTip, EuiIcon } from '@elastic/eui';
import { timer, combineLatest, of } from 'rxjs';
import { switchMap, filter, catchError } from 'rxjs/operators';
import { useAsObservable } from '../../hooks';
import { NotificationsCountResponse } from '../../../../common/types/notifications';
import { useMlKibana } from '../../contexts/kibana';
import { useStorage } from '../../contexts/storage';
import { ML_NOTIFICATIONS_LAST_CHECKED_AT } from '../../../../common/types/storage';

export const NotificationsIndicator: FC = () => {
  const {
    services: {
      mlServices: { mlApiServices },
    },
  } = useMlKibana();
  const [lastCheckedAt] = useStorage(ML_NOTIFICATIONS_LAST_CHECKED_AT);

  const lastCheckedAt$ = useAsObservable(lastCheckedAt);

  const [notificationsCounts, setNotificationsCounts] = useState<NotificationsCountResponse>();

  useEffect(function startPollingNotifications() {
    const sub = combineLatest([
      lastCheckedAt$.pipe(filter((v): v is number => !!v)),
      timer(0, 5000),
    ])
      .pipe(
        switchMap(([lastChecked]) =>
          mlApiServices.notifications.countMessages$({ lastCheckedAt: lastChecked })
        ),
        catchError((error) => {
          // Fail silently for now
          return of({} as NotificationsCountResponse);
        })
      )
      .subscribe((response) => {
        setNotificationsCounts(response);
      });

    return () => {
      sub.unsubscribe();
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
                defaultMessage="There {count, plural, one {is # error} other {are # errors}}"
                values={{ count: errorsAndWarningCount }}
              />
            }
          >
            <EuiNotificationBadge>{errorsAndWarningCount}</EuiNotificationBadge>
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
                defaultMessage="You have unread notifications"
              />
            }
          >
            <EuiIcon
              type="bell"
              size={'s'}
              aria-label={i18n.translate('xpack.ml.notificationsIndicator.unreadIcon', {
                defaultMessage: 'Unread notifications indicator.',
              })}
            />
          </EuiToolTip>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};
