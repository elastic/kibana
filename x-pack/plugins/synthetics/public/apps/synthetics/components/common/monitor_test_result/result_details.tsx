/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList, EuiSpacer } from '@elastic/eui';
import { formatBytes } from '../../step_details_page/hooks/use_object_metrics';
import { ThresholdIndicator } from '../components/thershold_indicator';
import { useNetworkTimings } from '../../step_details_page/hooks/use_network_timings';
import { useNetworkTimingsPrevious24Hours } from '../../step_details_page/hooks/use_network_timings_prev';
import { formatMillisecond } from '../../step_details_page/common/network_data/data_formatting';
import { JourneyStep } from '../../../../../../common/runtime_types';
import { parseBadgeStatus, StatusBadge } from './status_badge';

export const ResultDetails = ({
  pingStatus,
  isExpanded,
  step,
}: {
  pingStatus: string;
  isExpanded: boolean;
  step: JourneyStep;
}) => {
  return (
    <div>
      <StatusBadge status={parseBadgeStatus(pingStatus)} />
      {isExpanded && (
        <>
          <EuiSpacer size="m" />
          <TimingDetails step={step} />
        </>
      )}
    </div>
  );
};
export const TimingDetails = ({ step }: { step: JourneyStep }) => {
  const { timingsWithLabels, transferSize } = useNetworkTimings(
    step.monitor.check_group,
    step.synthetics.step?.index
  );

  const {
    timingsWithLabels: prevTimingsWithLabels,
    loading,
    transferSizePrev,
  } = useNetworkTimingsPrevious24Hours(step.synthetics.step?.index);

  const items = timingsWithLabels?.map((item) => {
    const prevValueItem = prevTimingsWithLabels?.find((prev) => prev.label === item.label);
    const prevValue = prevValueItem?.value ?? 0;
    return {
      title: item.label,
      description: (
        <ThresholdIndicator
          loading={loading}
          currentFormatted={formatMillisecond(item.value, { digits: 1 })}
          current={Number(item.value.toFixed(1))}
          previous={Number(prevValue.toFixed(1))}
          previousFormatted={formatMillisecond(prevValue, { digits: 1 })}
        />
      ),
    };
  });

  items.push({
    title: transferSize.label,
    description: (
      <ThresholdIndicator
        current={transferSize.value}
        previous={transferSizePrev.value}
        currentFormatted={formatBytes(transferSize.value ?? 0)}
        previousFormatted={formatBytes(transferSizePrev.value ?? 0)}
      />
    ),
  });

  return (
    <EuiDescriptionList
      compressed={true}
      gutterSize="s"
      type="column"
      listItems={items}
      style={{ maxWidth: 250 }}
      textStyle="reverse"
      descriptionProps={{ style: { textAlign: 'right' } }}
    />
  );
};
