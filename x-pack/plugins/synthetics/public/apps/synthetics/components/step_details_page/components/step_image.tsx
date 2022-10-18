/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButtonGroup, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { LastSuccessfulScreenshot } from './last_successful_screenshot';
import { JourneyStep } from '../../../../../../common/runtime_types';
import { JourneyScreenshot } from '../../monitor_details/monitor_summary/last_ten_test_runs';

export const StepImage = ({ ping }: { ping: JourneyStep }) => {
  const toggleButtons = [
    {
      id: `received`,
      label: RECEIVED_LABEL,
    },
    {
      id: `expected`,
      label: EXPECTED_LABEL,
    },
  ];

  const [idSelected, setIdSelected] = useState(`received`);

  const onChangeDisabled = (optionId: string) => {
    setIdSelected(optionId);
  };

  return (
    <>
      <EuiTitle size="xs">
        <h3>{SCREENSHOT_LABEL}</h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <div className="eui-textCenter">
        {idSelected === 'received' ? (
          <JourneyScreenshot checkGroupId={ping.monitor.check_group} />
        ) : (
          <LastSuccessfulScreenshot step={ping} />
        )}

        <EuiSpacer size="l" />
        {ping.monitor.status === 'down' && (
          <EuiButtonGroup
            legend=""
            options={toggleButtons}
            idSelected={idSelected}
            onChange={(id) => onChangeDisabled(id)}
            buttonSize="s"
            isFullWidth
          />
        )}
      </div>
    </>
  );
};

const SCREENSHOT_LABEL = i18n.translate('xpack.synthetics.stepDetails.screenshot', {
  defaultMessage: 'Screenshot',
});

const EXPECTED_LABEL = i18n.translate('xpack.synthetics.stepDetails.expected', {
  defaultMessage: 'Expected',
});

const RECEIVED_LABEL = i18n.translate('xpack.synthetics.stepDetails.received', {
  defaultMessage: 'Received',
});
