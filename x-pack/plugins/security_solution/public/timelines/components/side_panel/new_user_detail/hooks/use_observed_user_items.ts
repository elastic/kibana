/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import * as i18n from '../translations';
import type { ObservedUserData, ObservedUserTable } from '../types';

export const useObservedUserItems = (userData: ObservedUserData): ObservedUserTable[] =>
  useMemo(
    () =>
      !userData.details
        ? []
        : [
            { label: i18n.USER_ID, values: userData.details.user?.id, field: 'user.id' },
            { label: 'Domain', values: userData.details.user?.domain, field: 'user.domain' },
            {
              label: i18n.MAX_ANOMALY_SCORE_BY_JOB,
              field: 'anomalies',
              values: userData.anomalies,
            },
            {
              label: i18n.FIRST_SEEN,
              values: userData.firstSeen.date ? [userData.firstSeen.date] : undefined,
              field: '@timestamp',
            },
            {
              label: i18n.LAST_SEEN,
              values: userData.lastSeen.date ? [userData.lastSeen.date] : undefined,
              field: '@timestamp',
            },
            {
              label: i18n.OPERATING_SYSTEM_TITLE,
              values: userData.details.host?.os?.name,
              field: 'host.os.name',
            },
            {
              label: i18n.FAMILY,
              values: userData.details.host?.os?.family,
              field: 'host.os.family',
            },
            { label: i18n.IP_ADDRESSES, values: userData.details.host?.ip, field: 'host.ip' },
          ],
    [userData.details, userData.anomalies, userData.firstSeen, userData.lastSeen]
  );
