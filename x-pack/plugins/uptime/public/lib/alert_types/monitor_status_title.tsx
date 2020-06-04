/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { snapshotDataSelector, esKuerySelector } from '../../state/selectors';
import { getSnapshotCountAction } from '../../state/actions';

export const MonitorStatusTitle = () => {
  const { count, loading } = useSelector(snapshotDataSelector);
  const esKuery = useSelector(esKuerySelector);
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(
      getSnapshotCountAction({ dateRangeStart: 'now-15m', dateRangeEnd: 'now', filters: esKuery })
    );
  }, [dispatch, esKuery]);

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <FormattedMessage
          id="xpack.uptime.alerts.monitorStatus.title.label"
          defaultMessage="Uptime monitor status"
        />{' '}
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={{ alignSelf: 'center' }}>
        {!loading ? (
          <EuiText size="s" color="subdued">
            {count.total} monitors
          </EuiText>
        ) : (
          <EuiLoadingSpinner size="m" />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
