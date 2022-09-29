/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useContext, useEffect, useState } from 'react';
import { combineLatest, of, timer } from 'rxjs';
import { catchError, switchMap, map, tap } from 'rxjs/operators';
import moment from 'moment';
import { useMlKibana } from '../kibana';
import { useStorage } from '../storage';
import { ML_NOTIFICATIONS_LAST_CHECKED_AT } from '../../../../common/types/storage';
import { useAsObservable } from '../../hooks';
import type { NotificationsCountResponse } from '../../../../common/types/notifications';

const NOTIFICATIONS_CHECK_INTERVAL = 60000;

export const MlNotificationsContext = React.createContext<{
  notificationsCounts: NotificationsCountResponse;
  /** Timestamp of the latest notification checked by the user */
  lastCheckedAt: number | null;
  /** Holds the value used for the actual request */
  latestRequestedAt: number | null;
  setLastCheckedAt: (v: number) => void;
}>({
  notificationsCounts: { info: 0, error: 0, warning: 0 },
  lastCheckedAt: null,
  latestRequestedAt: null,
  setLastCheckedAt: () => {},
});

export const MlNotificationsContextProvider: FC = ({ children }) => {
  const {
    services: {
      mlServices: { mlApiServices },
    },
  } = useMlKibana();

  const [lastCheckedAt, setLastCheckedAt] = useStorage(ML_NOTIFICATIONS_LAST_CHECKED_AT);
  const lastCheckedAt$ = useAsObservable(lastCheckedAt);

  /** Holds the value used for the actual request */
  const [latestRequestedAt, setLatestRequestedAt] = useState<number | null>(null);
  const [notificationsCounts, setNotificationsCounts] = useState<NotificationsCountResponse>({
    info: 0,
    error: 0,
    warning: 0,
  });

  useEffect(function startPollingNotifications() {
    const subscription = combineLatest([lastCheckedAt$, timer(0, NOTIFICATIONS_CHECK_INTERVAL)])
      .pipe(
        // Use the latest check time or 7 days ago by default.
        map(([lastChecked]) => lastChecked ?? moment().subtract(7, 'd').valueOf()),
        tap((lastCheckedAtQuery) => {
          setLatestRequestedAt(lastCheckedAtQuery);
        }),
        switchMap((lastCheckedAtQuery) =>
          mlApiServices.notifications.countMessages$({
            lastCheckedAt: lastCheckedAtQuery,
          })
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
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <MlNotificationsContext.Provider
      value={{ notificationsCounts, lastCheckedAt, setLastCheckedAt, latestRequestedAt }}
    >
      {children}
    </MlNotificationsContext.Provider>
  );
};

export function useMlNotifications() {
  return useContext(MlNotificationsContext);
}
