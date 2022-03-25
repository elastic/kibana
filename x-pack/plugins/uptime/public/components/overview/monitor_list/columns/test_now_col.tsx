/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { useDispatch, useSelector } from 'react-redux';
import { EuiButtonIcon, EuiLoadingSpinner, EuiToolTip } from '@elastic/eui';
import { testNowMonitorAction } from '../../../../state/actions';
import { testNowRunSelector } from '../../../../state/reducers/test_now_runs';

export const TestNowColumn = ({
  monitorId,
  configId,
}: {
  monitorId: string;
  configId?: string;
}) => {
  const dispatch = useDispatch();

  const testNowRun = useSelector(testNowRunSelector(configId));

  if (!configId) {
    return (
      <EuiToolTip content={TEST_NOW_AVAILABLE_LABEL}>
        <>--</>
      </EuiToolTip>
    );
  }

  const testNowClick = () => {
    dispatch(testNowMonitorAction.get(configId));
  };

  if (testNowRun && testNowRun.status === 'loading') {
    return <EuiLoadingSpinner size="s" />;
  }

  return (
    <EuiToolTip content={testNowRun ? TEST_SCHEDULED_LABEL : TEST_NOW_LABEL}>
      <EuiButtonIcon
        iconType="play"
        onClick={() => testNowClick()}
        isDisabled={Boolean(testNowRun)}
        aria-label={TEST_NOW_ARIA_LABEL}
      />
    </EuiToolTip>
  );
};

export const TEST_NOW_ARIA_LABEL = i18n.translate('xpack.uptime.monitorList.testNow.AriaLabel', {
  defaultMessage: 'CLick to run test now',
});

export const TEST_NOW_AVAILABLE_LABEL = i18n.translate(
  'xpack.uptime.monitorList.testNow.available',
  {
    defaultMessage: 'Test now is only available for monitors added via Monitor management.',
  }
);

export const TEST_NOW_LABEL = i18n.translate('xpack.uptime.monitorList.testNow.label', {
  defaultMessage: 'Test now',
});

export const TEST_SCHEDULED_LABEL = i18n.translate('xpack.uptime.monitorList.testNow.scheduled', {
  defaultMessage: 'Test is already scheduled',
});
