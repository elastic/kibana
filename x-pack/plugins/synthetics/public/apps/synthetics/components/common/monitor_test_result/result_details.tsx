/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useStepMetrics } from '../../step_details_page/hooks/use_step_metrics';
import { JourneyStepScreenshotContainer } from '../screenshot/journey_step_screenshot_container';
import { ThresholdIndicator } from '../components/thershold_indicator';
import { useNetworkTimings } from '../../step_details_page/hooks/use_network_timings';
import { useNetworkTimingsPrevious24Hours } from '../../step_details_page/hooks/use_network_timings_prev';
import { formatMillisecond } from '../../step_details_page/common/network_data/data_formatting';
import { JourneyStep } from '../../../../../../common/runtime_types';
import { parseBadgeStatus, StatusBadge } from './status_badge';
import { useStepPrevMetrics } from '../../step_details_page/hooks/use_step_prev_metrics';

export const ResultDetails = ({
  testNowMode,
  pingStatus,
  isExpanded,
  step,
}: {
  pingStatus: string;
  isExpanded: boolean;
  testNowMode: boolean;
  step: JourneyStep;
}) => {
  return (
    <div>
      <EuiText className="eui-textNoWrap" size="s">
        <StatusBadge status={parseBadgeStatus(pingStatus)} />{' '}
        {!testNowMode
          ? i18n.translate('xpack.synthetics.step.duration.label', {
              defaultMessage: 'after {value}',
              values: {
                value: formatMillisecond((step.synthetics?.step?.duration.us ?? 0) / 1000, {}),
              },
            })
          : ''}
      </EuiText>

      {isExpanded && (
        <>
          <EuiSpacer size="m" />
          <JourneyStepScreenshotContainer
            checkGroup={step.monitor.check_group}
            initialStepNumber={step.synthetics?.step?.index}
            stepStatus={step.synthetics.payload?.status}
            allStepsLoaded={true}
            retryFetchOnRevisit={false}
            size={[260, 160]}
          />
          <EuiSpacer size="m" />
          <TimingDetails step={step} />
          <EuiSpacer size="xs" />
          <StepMetrics step={step} />
        </>
      )}
    </div>
  );
};

export const TimingDetails = ({ step }: { step: JourneyStep }) => {
  const { timingsWithLabels } = useNetworkTimings(
    step.monitor.check_group,
    step.synthetics.step?.index
  );

  const { timingsWithLabels: prevTimingsWithLabels, loading } = useNetworkTimingsPrevious24Hours(
    step.synthetics.step?.index,
    step['@timestamp'],
    step.monitor.check_group
  );

  const items = timingsWithLabels?.map((item) => {
    const prevValueItem = prevTimingsWithLabels?.find((prev) => prev.label === item.label);
    const prevValue = prevValueItem?.value;
    return {
      title: item.label,
      description: (
        <ThresholdIndicator
          loading={loading}
          currentFormatted={formatMillisecond(item.value, {})}
          current={item.value}
          previous={prevValue}
          previousFormatted={formatMillisecond(prevValue ?? 0, {})}
        />
      ),
    };
  });

  return (
    <EuiDescriptionList
      compressed={true}
      type="column"
      listItems={items}
      style={{ maxWidth: 265 }}
      textStyle="reverse"
      descriptionProps={{ style: { textAlign: 'right' } }}
    />
  );
};

export const StepMetrics = ({ step }: { step: JourneyStep }) => {
  const { metrics: stepMetrics } = useStepMetrics(step);
  const { metrics: prevMetrics, loading } = useStepPrevMetrics(step);

  const items = stepMetrics?.map((item) => {
    const prevValueItem = prevMetrics?.find((prev) => prev.label === item.label);
    const prevValue = prevValueItem?.value;
    return {
      title: item.label,
      description: (
        <ThresholdIndicator
          loading={loading}
          currentFormatted={item.formatted}
          current={item.value ?? 0}
          previous={prevValue}
          previousFormatted={prevValueItem?.formatted!}
        />
      ),
    };
  });

  return (
    <EuiDescriptionList
      compressed={true}
      type="column"
      listItems={items}
      style={{ maxWidth: 265 }}
      textStyle="reverse"
      descriptionProps={{ style: { textAlign: 'right' } }}
    />
  );
};
