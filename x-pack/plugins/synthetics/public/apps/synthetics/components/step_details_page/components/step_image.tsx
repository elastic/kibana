/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButtonGroup, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { LastSuccessfulScreenshot } from './screenshot/last_successful_screenshot';
import { JourneyStep } from '../../../../../../common/runtime_types';
import { JourneyStepScreenshotContainer } from '../../common/screenshot/journey_step_screenshot_container';

export const StepImage = ({
  step,
  ping,
  isFailed,
  stepLabels,
}: {
  ping: JourneyStep;
  step: JourneyStep;
  isFailed?: boolean;
  stepLabels?: string[];
}) => {
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
          <JourneyStepScreenshotContainer
            checkGroup={step?.monitor.check_group}
            initialStepNo={step?.synthetics?.step?.index}
            stepStatus={step?.synthetics.payload?.status}
            allStepsLoaded={true}
            stepLabels={stepLabels}
            retryFetchOnRevisit={false}
            asThumbnail={false}
          />
        ) : (
          <LastSuccessfulScreenshot step={ping} />
        )}

        <EuiSpacer size="l" />
        {isFailed && (
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
