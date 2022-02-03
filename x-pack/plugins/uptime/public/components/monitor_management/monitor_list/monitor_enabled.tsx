/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSwitch, EuiProgress, EuiSwitchEvent } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { FETCH_STATUS, useFetcher } from '../../../../../observability/public';
import { ConfigKey, SyntheticsMonitor } from '../../../../common/runtime_types';
import { setMonitor } from '../../../state/api';

interface Props {
  id: string;
  monitor: SyntheticsMonitor;
  onUpdate: () => void;
  isDisabled?: boolean;
}

export const MonitorEnabled = ({ id, monitor, onUpdate, isDisabled }: Props) => {
  const [isEnabled, setIsEnabled] = useState<boolean | null>(null);

  const { notifications } = useKibana();

  const { status } = useFetcher(() => {
    if (isEnabled !== null) {
      return setMonitor({ id, monitor: { ...monitor, [ConfigKey.ENABLED]: isEnabled } });
    }
  }, [isEnabled]);

  useEffect(() => {
    if (status === FETCH_STATUS.FAILURE) {
      notifications.toasts.danger({
        title: (
          <p data-test-subj="uptimeMonitorEnabledUpdateFailure">
            {getMonitorEnabledUpdateFailureMessage(monitor[ConfigKey.NAME])}
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
              ? getMonitorEnabledSuccessLabel(monitor[ConfigKey.NAME])
              : getMonitorDisabledSuccessLabel(monitor[ConfigKey.NAME])}
          </p>
        ),
        toastLifeTimeMs: 3000,
      });
      onUpdate();
    }
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  const enabled = isEnabled ?? monitor[ConfigKey.ENABLED];
  const isLoading = status === FETCH_STATUS.LOADING;

  const handleEnabledChange = (event: EuiSwitchEvent) => {
    const checked = event.target.checked;
    setIsEnabled(checked);
  };

  return (
    <div css={{ position: 'relative' }} aria-busy={isLoading}>
      <EuiSwitch
        checked={enabled}
        disabled={isLoading || isDisabled}
        showLabel={false}
        label={enabled ? DISABLE_MONITOR_LABEL : ENABLE_MONITOR_LABEL}
        title={enabled ? DISABLE_MONITOR_LABEL : ENABLE_MONITOR_LABEL}
        data-test-subj="syntheticsIsMonitorEnabled"
        onChange={handleEnabledChange}
      />
      {isLoading ? (
        <EuiProgress
          css={{ position: 'absolute', left: 0, bottom: -4, width: '100%', height: 2 }}
          size="xs"
          color="primary"
        />
      ) : null}
    </div>
  );
};

const ENABLE_MONITOR_LABEL = i18n.translate('xpack.uptime.monitorManagement.enableMonitorLabel', {
  defaultMessage: 'Enable monitor',
});

const DISABLE_MONITOR_LABEL = i18n.translate('xpack.uptime.monitorManagement.disableMonitorLabel', {
  defaultMessage: 'Disable monitor',
});

const getMonitorEnabledSuccessLabel = (name: string) =>
  i18n.translate('xpack.uptime.monitorManagement.monitorEnabledSuccessMessage', {
    defaultMessage: 'Monitor {name} enabled successfully.',
    values: { name },
  });

const getMonitorDisabledSuccessLabel = (name: string) =>
  i18n.translate('xpack.uptime.monitorManagement.monitorDisabledSuccessMessage', {
    defaultMessage: 'Monitor {name} disabled successfully.',
    values: { name },
  });

const getMonitorEnabledUpdateFailureMessage = (name: string) =>
  i18n.translate('xpack.uptime.monitorManagement.monitorEnabledUpdateFailureMessage', {
    defaultMessage: 'Unable to update monitor {name}.',
    values: { name },
  });
