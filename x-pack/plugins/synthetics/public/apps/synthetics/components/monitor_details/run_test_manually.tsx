/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiToolTip } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useDispatch, useSelector } from 'react-redux';
import { CANNOT_PERFORM_ACTION_PUBLIC_LOCATIONS } from '../common/components/permissions';
import { useCanUsePublicLocations } from '../../../../hooks/use_capabilities';
import { ConfigKey } from '../../../../../common/constants/monitor_management';
import { TEST_NOW_ARIA_LABEL, TEST_SCHEDULED_LABEL } from '../monitor_add_edit/form/run_test_btn';
import { useSelectedMonitor } from './hooks/use_selected_monitor';
import {
  manualTestMonitorAction,
  manualTestRunInProgressSelector,
} from '../../state/manual_test_runs';

export const RunTestManually = () => {
  const dispatch = useDispatch();

  const { monitor } = useSelectedMonitor();
  const testInProgress = useSelector(manualTestRunInProgressSelector(monitor?.config_id));

  const canUsePublicLocations = useCanUsePublicLocations(monitor?.[ConfigKey.LOCATIONS]);

  const content = !canUsePublicLocations
    ? CANNOT_PERFORM_ACTION_PUBLIC_LOCATIONS
    : testInProgress
    ? TEST_SCHEDULED_LABEL
    : TEST_NOW_ARIA_LABEL;

  return (
    <EuiToolTip content={content} key={content}>
      <EuiButton
        data-test-subj="syntheticsRunTestManuallyButton"
        color="success"
        iconType="beaker"
        isLoading={!Boolean(monitor) || testInProgress}
        isDisabled={!canUsePublicLocations}
        onClick={() => {
          if (monitor) {
            dispatch(
              manualTestMonitorAction.get({ configId: monitor.config_id, name: monitor.name })
            );
          }
        }}
      >
        {RUN_TEST_LABEL}
      </EuiButton>
    </EuiToolTip>
  );
};

const RUN_TEST_LABEL = i18n.translate('xpack.synthetics.monitorSummary.runTestManually', {
  defaultMessage: 'Run test manually',
});
