/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, type FC } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { useTimefilter } from '@kbn/ml-date-picker';
import { AnomalyDetectionPanel } from './anomaly_detection_panel';
import { AnalyticsPanel } from './analytics_panel';
import { AnomalyTimelineService } from '../../services/anomaly_timeline_service';
import { mlResultsServiceProvider } from '../../services/results_service';
import { useMlKibana } from '../../contexts/kibana';
import { useEnabledFeatures } from '../../contexts/ml';

interface Props {
  createAnomalyDetectionJobDisabled: boolean;
  setAdLazyJobCount: React.Dispatch<React.SetStateAction<number>>;
  setDfaLazyJobCount: React.Dispatch<React.SetStateAction<number>>;
}

export const OverviewContent: FC<Props> = ({
  createAnomalyDetectionJobDisabled,
  setAdLazyJobCount,
  setDfaLazyJobCount,
}) => {
  const {
    services: {
      uiSettings,
      mlServices: { mlApiServices },
    },
  } = useMlKibana();

  const { isADEnabled, isDFAEnabled } = useEnabledFeatures();

  const timefilter = useTimefilter();

  const [anomalyTimelineService, setAnomalyTimelineService] = useState<AnomalyTimelineService>();

  useEffect(() => {
    setAnomalyTimelineService(
      new AnomalyTimelineService(timefilter, uiSettings, mlResultsServiceProvider(mlApiServices))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (anomalyTimelineService === undefined) {
    return null;
  }

  return (
    <>
      {isADEnabled ? (
        <>
          <AnomalyDetectionPanel
            anomalyTimelineService={anomalyTimelineService}
            setLazyJobCount={setAdLazyJobCount}
          />
          <EuiSpacer size="m" />
        </>
      ) : null}

      {isDFAEnabled ? <AnalyticsPanel setLazyJobCount={setDfaLazyJobCount} /> : null}
    </>
  );
};
