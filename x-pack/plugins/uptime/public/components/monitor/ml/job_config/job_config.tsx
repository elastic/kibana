/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';
import { EuiSpacer, EuiSteps, EuiSwitch } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { useSelector } from 'react-redux';
import { TimerangePicker } from './timerange_picker';
import { JobBucketSpan } from './bucket_span';
import { useFetcher } from '../../../../../../observability/public';
import { getTimeFieldRange } from '../../../../state/api/ml_anomaly';
import { selectDynamicSettings } from '../../../../state/selectors';
import { useMonitorId } from '../../../../hooks';

export interface TimeRange {
  start?: number;
  end?: number;
}

interface Props {
  bucketSpan: string;
  setBucketSpan: (bs: string) => void;
  timeRange: TimeRange;
  setTimeRange: (tr: TimeRange) => void;
}
export const JobConfig = ({ bucketSpan, timeRange, setTimeRange, setBucketSpan }: Props) => {
  const [useFullData, setUseFullData] = useState(false);

  const monitorId = useMonitorId();

  const dss = useSelector(selectDynamicSettings);

  const { data } = useFetcher(() => {
    if (useFullData && !data) {
      return getTimeFieldRange(dss?.settings?.heartbeatIndices!, monitorId);
    }
  }, [useFullData]);

  useEffect(() => {
    if (data?.success && useFullData && data?.start.epoch > 0) {
      // only set start, end undefined means job will use data in a continues manner
      setTimeRange({ start: data.start.epoch });
    }
  }, [data, useFullData, setTimeRange]);

  const firstSetOfSteps = [
    {
      title: 'Configuration',
      children: (
        <>
          <EuiSwitch
            data-test-subj={'uptimeAnomalyJobSwitchFullData'}
            label={
              <FormattedMessage
                id="xpack.uptime.ml.enableAnomalyDetectionPanel.useFullData.label"
                defaultMessage="Use full {index} data"
                values={{ index: dss?.settings?.heartbeatIndices }}
              />
            }
            checked={useFullData}
            onChange={(evt) => {
              setUseFullData(evt.target.checked);
              if (data) {
                setTimeRange({ start: data.start.epoch });
              }
            }}
          />
          <EuiSpacer />
          <TimerangePicker
            timeRange={{
              start: timeRange?.start,
              end: timeRange?.end,
            }}
            setTimeRange={setTimeRange}
            disabled={useFullData}
          />
          <JobBucketSpan
            disabled={false}
            bucketSpan={bucketSpan}
            setBucketSpan={setBucketSpan}
            timeRange={timeRange}
          />
        </>
      ),
    },
    {
      title: 'Create ML job',
      children: <></>,
    },
  ];
  return <EuiSteps steps={firstSetOfSteps} />;
};
