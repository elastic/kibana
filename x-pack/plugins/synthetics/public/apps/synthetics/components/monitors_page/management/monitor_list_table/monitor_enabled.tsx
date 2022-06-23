/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSwitch, EuiSwitchEvent, EuiLoadingSpinner } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { FETCH_STATUS, useFetcher } from '@kbn/observability-plugin/public';

import { useCanEditSynthetics } from '../../../../../../hooks/use_capabilities';
import { ConfigKey, EncryptedSyntheticsMonitor } from '../../../../../../../common/runtime_types';
import { fetchUpsertMonitor } from '../../../../state';

import * as labels from './labels';

interface Props {
  id: string;
  monitor: EncryptedSyntheticsMonitor;
  reloadPage: () => void;
  initialLoading?: boolean;
}

export const MonitorEnabled = ({ id, monitor, reloadPage, initialLoading }: Props) => {
  const isDisabled = !useCanEditSynthetics();

  const [isEnabled, setIsEnabled] = useState<boolean | null>(null);

  const { notifications } = useKibana();

  const { status } = useFetcher(() => {
    if (isEnabled !== null) {
      return fetchUpsertMonitor({ id, monitor: { ...monitor, [ConfigKey.ENABLED]: isEnabled } });
    }
  }, [isEnabled]);

  useEffect(() => {
    if (status === FETCH_STATUS.FAILURE) {
      notifications.toasts.danger({
        title: (
          <p data-test-subj="uptimeMonitorEnabledUpdateFailure">
            {labels.getMonitorEnabledUpdateFailureMessage(monitor[ConfigKey.NAME])}
          </p>
        ),
        toastLifeTimeMs: 3000,
      });
      setIsEnabled(null);
    } else if (status === FETCH_STATUS.SUCCESS) {
      notifications.toasts.success({
        title: (
          <p data-test-subj="uptimeMonitorEnabledUpdateSuccess">
            {isEnabled
              ? labels.getMonitorEnabledSuccessLabel(monitor[ConfigKey.NAME])
              : labels.getMonitorDisabledSuccessLabel(monitor[ConfigKey.NAME])}
          </p>
        ),
        toastLifeTimeMs: 3000,
      });
      reloadPage();
    }
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  const enabled = isEnabled ?? monitor[ConfigKey.ENABLED];
  const isLoading = status === FETCH_STATUS.LOADING;

  const handleEnabledChange = (event: EuiSwitchEvent) => {
    const checked = event.target.checked;
    setIsEnabled(checked);
  };

  return (
    <>
      {isLoading || initialLoading ? (
        <EuiLoadingSpinner size="m" />
      ) : (
        <EuiSwitch
          checked={enabled}
          disabled={isLoading || isDisabled}
          showLabel={false}
          label={enabled ? labels.DISABLE_MONITOR_LABEL : labels.ENABLE_MONITOR_LABEL}
          title={enabled ? labels.DISABLE_MONITOR_LABEL : labels.ENABLE_MONITOR_LABEL}
          data-test-subj="syntheticsIsMonitorEnabled"
          onChange={handleEnabledChange}
        />
      )}
    </>
  );
};
