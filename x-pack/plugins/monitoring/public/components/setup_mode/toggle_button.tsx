/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { METRIC_TYPE, useUiTracker } from '@kbn/observability-plugin/public';
import { TELEMETRY_METRIC_BUTTON_CLICK } from '../../../common/constants';
import { SetupModeExitButton } from './exit_button';

export interface SetupModeToggleButtonProps {
  enabled: boolean;
  toggleSetupMode: (state: boolean) => void;
}

export const SetupModeToggleButton: React.FC<SetupModeToggleButtonProps> = (
  props: SetupModeToggleButtonProps
) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const trackStat = useUiTracker({ app: 'stack_monitoring' });

  function toggleSetupMode(enabled: boolean, stat: string) {
    setIsLoading(true);
    props.toggleSetupMode(enabled);
    trackStat({
      metric: `${TELEMETRY_METRIC_BUTTON_CLICK}setupmode_${stat}`,
      metricType: METRIC_TYPE.CLICK,
    });
    setIsLoading(false);
  }

  if (props.enabled) {
    return <SetupModeExitButton exitSetupMode={() => toggleSetupMode(false, 'exit')} />;
  }

  return (
    <EuiButton
      onClick={() => toggleSetupMode(true, 'enter')}
      iconType="flag"
      size="s"
      iconSide="right"
      isLoading={isLoading}
      data-test-subj="monitoringSetupModeBtn"
    >
      {i18n.translate('xpack.monitoring.setupMode.enter', {
        defaultMessage: 'Enter setup mode',
      })}
    </EuiButton>
  );
};
