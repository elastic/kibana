/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { EuiLoadingSpinner } from '@elastic/eui';
import { useMonitorLatestPing } from './hooks/use_monitor_latest_ping';
import { PageLoader } from '../common/components/page_loader';
import { resetMonitorLastRunAction } from '../../state';

export const MonitorPendingWrapper: React.FC = ({ children }) => {
  const dispatch = useDispatch();
  const history = useHistory();
  const { monitorId } = useParams<{ monitorId: string }>();

  const { latestPing, loaded: pingsLoaded } = useMonitorLatestPing();
  const [loaded, setLoaded] = useState(false);
  const [hasPing, setHasPing] = useState(false);

  const unlisten = useMemo(
    () =>
      history.listen((location) => {
        const currentMonitorId = location.pathname.split('/')[2] || '';
        if (currentMonitorId !== monitorId) {
          dispatch(resetMonitorLastRunAction());
        }
      }),
    [history, monitorId, dispatch]
  );

  useEffect(() => {
    return function cleanup() {
      unlisten();
    };
  }, [unlisten]);

  useEffect(() => {
    if (pingsLoaded) {
      setLoaded(true);
    }
    if (pingsLoaded && latestPing) {
      setHasPing(true);
    }
  }, [pingsLoaded, latestPing, dispatch, unlisten]);

  if (!loaded) {
    return (
      <PageLoader
        icon={<EuiLoadingSpinner size="xxl" />}
        title={<h3>{LOADING_TITLE}</h3>}
        body={LOADING_DESCRIPTION}
      />
    );
  }

  return !hasPing ? (
    <PageLoader title={<h3>{MONITOR_PENDING_HEADING}</h3>} body={MONITOR_PENDING_CONTENT} />
  ) : (
    <>{children}</>
  );
};

export const MONITOR_PENDING_HEADING = i18n.translate(
  'xpack.synthetics.monitorDetails.pending.heading',
  {
    defaultMessage: 'Initial test run pending...',
  }
);

export const MONITOR_PENDING_CONTENT = i18n.translate(
  'xpack.synthetics.monitorDetails.pending.content',
  {
    defaultMessage: 'This page will refresh when data becomes available.',
  }
);

export const LOADING_DESCRIPTION = i18n.translate(
  'xpack.synthetics.monitorDetails.loading.content',
  {
    defaultMessage: 'This will take just a second.',
  }
);

export const LOADING_TITLE = i18n.translate('xpack.synthetics.monitorDetails.loading.heading', {
  defaultMessage: 'Loading monitor details',
});
