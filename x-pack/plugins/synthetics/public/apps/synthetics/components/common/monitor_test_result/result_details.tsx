/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList, EuiSpacer } from '@elastic/eui';
import { formatMillisecond } from '../../step_details_page/common/network_data/data_formatting';
import { useNetworkTimings } from '../../step_details_page/hooks/use_network_timings';
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
  const { timingsWithLabels } = useNetworkTimings(
    step.monitor.check_group,
    step.synthetics.step?.index
  );

  const items = timingsWithLabels?.map((item) => ({
    title: item.label,
    description: formatMillisecond(item.value),
  }));

  return (
    <EuiDescriptionList
      type="column"
      listItems={items}
      style={{ maxWidth: 200 }}
      textStyle="reverse"
      descriptionProps={{ style: { textAlign: 'right' } }}
    />
  );
};
