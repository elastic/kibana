/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButtonGroup, EuiSpacer, EuiTitle } from '@elastic/eui';
import { LastSuccessfulScreenshot } from './last_successful_screenshot';
import { JourneyStep } from '../../../../../../common/runtime_types';
import { JourneyScreenshot } from '../../monitor_details/monitor_summary/last_ten_test_runs';

export const StepImage = ({ ping }: { ping: JourneyStep }) => {
  const toggleButtonsDisabled = [
    {
      id: `received`,
      label: 'Received',
    },
    {
      id: `expected`,
      label: 'Expected',
    },
  ];

  const [idSelected, setIdSelected] = useState(`received`);

  const onChangeDisabled = (optionId: string) => {
    setIdSelected(optionId);
  };

  return (
    <>
      <EuiTitle size="xs">
        <h3>Screenshot</h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <div className="eui-textCenter">
        {idSelected === 'received' ? (
          <JourneyScreenshot checkGroupId={ping.monitor.check_group} />
        ) : (
          <LastSuccessfulScreenshot step={ping} />
        )}

        <EuiSpacer size="l" />

        <EuiButtonGroup
          legend="This is a disabled group"
          options={toggleButtonsDisabled}
          idSelected={idSelected}
          onChange={(id) => onChangeDisabled(id)}
          buttonSize="s"
          isFullWidth
        />
      </div>
    </>
  );
};
