/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { encode } from 'rison-node';
import { TimeRange } from '../../../../common/http_api/shared/time_range';
import { useLinkProps, LinkDescriptor } from '../../../hooks/use_link_props';

type DatemathRange = TimeRange | { startTime: string; endTime: string };

export const AnalyzeInMlButton: React.FunctionComponent<{
  jobId: string;
  partition?: string;
  timeRange: DatemathRange;
}> = ({ jobId, partition, timeRange }) => {
  const linkProps = useLinkProps(
    typeof partition === 'string'
      ? getEntitySpecificSingleMetricViewerLink(jobId, timeRange, {
          'event.dataset': partition,
        })
      : getOverallAnomalyExplorerLinkDescriptor(jobId, timeRange)
  );
  const buttonLabel = (
    <FormattedMessage
      id="xpack.infra.logs.analysis.analyzeInMlButtonLabel"
      defaultMessage="Analyze in ML"
    />
  );
  return typeof partition === 'string' ? (
    <EuiButton fill={false} size="s" {...linkProps}>
      {buttonLabel}
    </EuiButton>
  ) : (
    <EuiButton fill={true} size="s" {...linkProps}>
      {buttonLabel}
    </EuiButton>
  );
};

export const getOverallAnomalyExplorerLinkDescriptor = (
  jobId: string,
  timeRange: DatemathRange
): LinkDescriptor => {
  const { from, to } = convertTimeRangeToParams(timeRange);

  const _g = encode({
    ml: {
      jobIds: [jobId],
    },
    time: {
      from,
      to,
    },
  });

  return {
    app: 'ml',
    hash: '/explorer',
    search: { _g },
  };
};

export const getEntitySpecificSingleMetricViewerLink = (
  jobId: string,
  timeRange: DatemathRange,
  entities: Record<string, string>
): LinkDescriptor => {
  const { from, to } = convertTimeRangeToParams(timeRange);

  const _g = encode({
    ml: {
      jobIds: [jobId],
    },
    time: {
      from,
      to,
      mode: 'absolute',
    },
  });

  const _a = encode({
    mlTimeSeriesExplorer: {
      entities,
    },
  });

  return {
    app: 'ml',
    hash: '/timeseriesexplorer',
    search: { _g, _a },
  };
};

const convertTimeRangeToParams = (timeRange: DatemathRange): { from: string; to: string } => {
  return {
    from:
      typeof timeRange.startTime === 'number'
        ? new Date(timeRange.startTime).toISOString()
        : timeRange.startTime,
    to:
      typeof timeRange.endTime === 'number'
        ? new Date(timeRange.endTime).toISOString()
        : timeRange.endTime,
  };
};
