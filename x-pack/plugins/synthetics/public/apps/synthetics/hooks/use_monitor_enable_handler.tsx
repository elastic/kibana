/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { FETCH_STATUS, useFetcher } from '@kbn/observability-plugin/public';
import React, { useEffect, useState } from 'react';
import { ConfigKey, EncryptedSyntheticsMonitor } from '../components/monitors_page/overview/types';
import { fetchUpsertMonitor } from '../state';

export interface EnableStateMonitorLabels {
  failureLabel: string;
  enabledSuccessLabel: string;
  disabledSuccessLabel: string;
}

export function useMonitorEnableHandler({
  id,
  monitor,
  reloadPage,
  labels,
}: {
  id: string;
  monitor: EncryptedSyntheticsMonitor;
  reloadPage: () => void;
  labels?: EnableStateMonitorLabels;
}) {
  const [isEnabled, setIsEnabled] = useState<boolean | null>(null);
  const { status } = useFetcher(() => {
    if (isEnabled !== null) {
      return fetchUpsertMonitor({ id, monitor: { ...monitor, [ConfigKey.ENABLED]: isEnabled } });
    }
  }, [isEnabled]);
  const { notifications } = useKibana();
  useEffect(() => {
    if (status === FETCH_STATUS.FAILURE && labels) {
      notifications.toasts.danger({
        title: <p data-test-subj="uptimeMonitorEnabledUpdateFailure">{labels.failureLabel}</p>,
        toastLifeTimeMs: 3000,
      });
      setIsEnabled(null);
    } else if (status === FETCH_STATUS.SUCCESS && labels) {
      notifications.toasts.success({
        title: (
          <p data-test-subj="uptimeMonitorEnabledUpdateSuccess">
            {isEnabled ? labels.enabledSuccessLabel : labels.disabledSuccessLabel}
          </p>
        ),
        toastLifeTimeMs: 3000,
      });
      reloadPage();
    }
  }, [status, labels]); // eslint-disable-line react-hooks/exhaustive-deps

  return { isEnabled, setIsEnabled, status };
}
