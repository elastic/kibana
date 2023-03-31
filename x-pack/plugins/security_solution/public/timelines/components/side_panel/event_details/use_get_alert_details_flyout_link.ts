/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import { useLocation } from 'react-router-dom';
import { useAppUrl } from '../../../../common/lib/kibana/hooks';
import { ALERTS_PATH } from '../../../../../common/constants';

export const useGetAlertDetailsFlyoutLink = ({
  _id,
  timestamp,
}: {
  _id?: string;
  timestamp?: string;
}) => {
  const { getAppUrl } = useAppUrl();
  const { pathname } = useLocation();
  const alertDetailsLink = useMemo(() => {
    const url = getAppUrl({
      path: `${ALERTS_PATH}/${_id}/${timestamp}`,
    });
    return `${window.location.origin}${url}`;
  }, [_id, getAppUrl, timestamp]);

  const isOnAlertsPage = pathname === ALERTS_PATH;

  return { isOnAlertsPage, alertDetailsLink };
};
