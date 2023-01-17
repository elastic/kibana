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
import { TEST_NOW_ARIA_LABEL, TEST_SCHEDULED_LABEL } from '../monitor_add_edit/form/run_test_btn';
import { useSelectedMonitor } from './hooks/use_selected_monitor';
import {
  manualTestMonitorAction,
  manualTestRunInProgressSelector,
} from '../../state/manual_test_runs';

export const RunTestManually = () => {
  const dispatch = useDispatch();

  const { monitor } = useSelectedMonitor();

  const hasPublicLocation = () => {
    return monitor?.locations.some((loc) => loc.isServiceManaged);
  };

  const testInProgress = useSelector(manualTestRunInProgressSelector(monitor?.config_id));

  const content = testInProgress ? TEST_SCHEDULED_LABEL : TEST_NOW_ARIA_LABEL;

  return (
    <EuiToolTip content={content} key={content}>
      <EuiButton
        color="success"
        iconType="beaker"
        isDisabled={!hasPublicLocation()}
        isLoading={!Boolean(monitor) || testInProgress}
        onClick={() => {
          if (monitor) {
            dispatch(manualTestMonitorAction.get(monitor.config_id));
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
