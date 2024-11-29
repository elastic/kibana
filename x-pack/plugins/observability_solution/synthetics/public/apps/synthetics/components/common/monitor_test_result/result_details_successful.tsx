/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiText, useEuiTheme } from '@elastic/eui';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { StepMetrics, TimingDetails } from './result_details';
import { useJourneySteps } from '../../monitor_details/hooks/use_journey_steps';
import { JourneyStepScreenshotContainer } from '../screenshot/journey_step_screenshot_container';
import { formatMillisecond } from '../../step_details_page/common/network_data/data_formatting';
import { JourneyStep } from '../../../../../../common/runtime_types';
import { IMAGE_UN_AVAILABLE } from '../../step_details_page/step_screenshot/last_successful_screenshot';
import { fetchLastSuccessfulCheck } from '../../../state';

export const ResultDetailsSuccessful = ({
  isExpanded,
  step,
}: {
  isExpanded: boolean;
  step: JourneyStep;
}) => {
  const { euiTheme } = useEuiTheme();

  const timestamp = step['@timestamp'];
  const monitorId = step.monitor.id;
  const stepIndex = Number(step.synthetics.step?.index);
  const location = step.observer?.geo?.name;

  const { data, loading } = useFetcher(() => {
    return fetchLastSuccessfulCheck({
      timestamp,
      monitorId,
      stepIndex,
      location,
    });
    // FIXME: Dario is not sure what step._id is being used for,
    // so he'll leave it in place
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timestamp, monitorId, stepIndex, location, step._id]);

  const { currentStep } = useJourneySteps(
    data?.monitor.check_group,
    0,
    Number(step.synthetics.step?.index)
  );

  return (
    <div>
      <EuiText className="eui-textNoWrap" size="s">
        {formatMillisecond((currentStep?.synthetics?.step?.duration.us ?? 0) / 1000, {})}
      </EuiText>

      {isExpanded && (
        <>
          <EuiSpacer size="m" />
          <JourneyStepScreenshotContainer
            checkGroup={data?.monitor.check_group}
            initialStepNumber={data?.synthetics?.step?.index}
            stepStatus={data?.synthetics?.payload?.status}
            allStepsLoaded={!loading}
            retryFetchOnRevisit={false}
            size={[260, 160]}
            unavailableMessage={IMAGE_UN_AVAILABLE}
            borderRadius={euiTheme.border.radius.small}
          />
          <EuiSpacer size="m" />
          {currentStep && <TimingDetails step={currentStep} />}
          <EuiSpacer size="xs" />
          {currentStep && <StepMetrics step={currentStep} />}
        </>
      )}
    </div>
  );
};
