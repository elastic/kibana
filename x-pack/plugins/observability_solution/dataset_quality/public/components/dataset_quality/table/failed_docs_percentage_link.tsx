/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSkeletonRectangle, EuiFlexGroup } from '@elastic/eui';
import React from 'react';
import { QualityPercentageIndicator } from '../../quality_indicator';
import { DataStreamStat } from '../../../../common/data_streams_stats/data_stream_stat';
import { TimeRangeConfig } from '../../../../common/types';

export const FailedDocsPercentageLink = ({
  isLoading,
  dataStreamStat,
  timeRange,
}: {
  isLoading: boolean;
  dataStreamStat: DataStreamStat;
  timeRange: TimeRangeConfig;
}) => {
  const {
    failedDocs: { percentage },
  } = dataStreamStat;

  return (
    <EuiSkeletonRectangle width="50px" height="20px" borderRadius="m" isLoading={isLoading}>
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <QualityPercentageIndicator percentage={percentage} />
      </EuiFlexGroup>
    </EuiSkeletonRectangle>
  );
};
