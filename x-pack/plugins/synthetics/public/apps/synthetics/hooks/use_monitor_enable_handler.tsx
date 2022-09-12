/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { FETCH_STATUS } from '@kbn/observability-plugin/public';
import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ConfigKey } from '../components/monitors_page/overview/types';
import {
  clearMonitorUpsertStatus,
  fetchUpsertMonitorAction,
  selectMonitorUpsertStatuses,
} from '../state';

export interface EnableStateMonitorLabels {
  failureLabel: string;
  enabledSuccessLabel: string;
  disabledSuccessLabel: string;
}

export function useMonitorEnableHandler({
  id,
  reloadPage,
  labels,
}: {
  id: string;
  reloadPage: () => void;
  labels?: EnableStateMonitorLabels;
}) {
  const dispatch = useDispatch();
  const upsertStatuses = useSelector(selectMonitorUpsertStatuses);
  const status = upsertStatuses[id]?.status;
  const savedObjEnabledState = upsertStatuses[id]?.enabled;
  const [isEnabled, setIsEnabled] = useState<boolean | null>(null);
  const updateMonitorEnabledState = useCallback(
    (enabled: boolean) => {
      dispatch(
        fetchUpsertMonitorAction({
          id,
          monitor: { [ConfigKey.ENABLED]: enabled },
        })
      );
    },
    [dispatch, id]
  );

  const { notifications } = useKibana();

  useEffect(() => {
    if (status === FETCH_STATUS.SUCCESS && labels) {
      notifications.toasts.success({
        title: (
          <p data-test-subj="uptimeMonitorEnabledUpdateSuccess">
            {savedObjEnabledState ? labels.enabledSuccessLabel : labels.disabledSuccessLabel}
          </p>
        ),
        toastLifeTimeMs: 3000,
      });
      setIsEnabled(!!savedObjEnabledState);
      dispatch(clearMonitorUpsertStatus(id));
      reloadPage();
    } else if (status === FETCH_STATUS.FAILURE && labels) {
      notifications.toasts.danger({
        title: <p data-test-subj="uptimeMonitorEnabledUpdateFailure">{labels.failureLabel}</p>,
        toastLifeTimeMs: 3000,
      });
      setIsEnabled(null);
      dispatch(clearMonitorUpsertStatus(id));
    }
  }, [
    status,
    labels,
    notifications.toasts,
    isEnabled,
    dispatch,
    id,
    reloadPage,
    savedObjEnabledState,
  ]);

  return { isEnabled, updateMonitorEnabledState, status };
}
