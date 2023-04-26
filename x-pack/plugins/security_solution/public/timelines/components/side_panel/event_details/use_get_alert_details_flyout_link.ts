/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import { useAppUrl } from '../../../../common/lib/kibana/hooks';
import { ALERTS_PATH } from '../../../../../common/constants';

export const useGetAlertDetailsFlyoutLink = ({
  _id,
  _index,
  timestamp,
}: {
  _id: string;
  _index: string;
  timestamp: string;
}) => {
  const { getAppUrl } = useAppUrl();
  // getAppUrl accounts for the users selected space
  const alertDetailsLink = useMemo(() => {
    const url = getAppUrl({
      path: `${ALERTS_PATH}/${_id}?index=${_index}&timestamp=${timestamp}`,
    });
    return `${window.location.origin}${url}`;
  }, [_id, _index, getAppUrl, timestamp]);

  return alertDetailsLink;
};
