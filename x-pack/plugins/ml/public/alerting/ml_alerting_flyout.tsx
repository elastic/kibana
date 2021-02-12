/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { JobId } from '../../common/types/anomaly_detection_jobs';
import { useMlKibana } from '../application/contexts/kibana';
import { ML_ALERT_TYPES } from '../../common/constants/alerts';
import { PLUGIN_ID } from '../../common/constants/app';

interface MlAnomalyAlertFlyoutProps {
  jobIds: JobId[];
  onSave?: () => void;
  onCloseFlyout: () => void;
}

/**
 * Invoke alerting flyout from the ML plugin context.
 * @param jobIds
 * @param onCloseFlyout
 * @constructor
 */
export const MlAnomalyAlertFlyout: FC<MlAnomalyAlertFlyoutProps> = ({
  jobIds,
  onCloseFlyout,
  onSave,
}) => {
  const {
    services: { triggersActionsUi },
  } = useMlKibana();

  const AddAlertFlyout = useMemo(
    () =>
      triggersActionsUi &&
      triggersActionsUi.getAddAlertFlyout({
        consumer: PLUGIN_ID,
        onClose: () => {
          onCloseFlyout();
        },
        // Callback for successful save
        reloadAlerts: async () => {
          if (onSave) {
            onSave();
          }
        },
        canChangeTrigger: false,
        alertTypeId: ML_ALERT_TYPES.ANOMALY_DETECTION,
        metadata: {},
        initialValues: {
          params: {
            jobSelection: {
              jobIds,
            },
          },
        },
      }),
    [triggersActionsUi]
  );

  return <>{AddAlertFlyout}</>;
};

interface JobListMlAnomalyAlertFlyoutProps {
  setShowFunction: (callback: Function) => void;
  unsetShowFunction: () => void;
}

/**
 * Component to wire the Alerting flyout with the Job list view.
 * @param setShowFunction
 * @param unsetShowFunction
 * @constructor
 */
export const JobListMlAnomalyAlertFlyout: FC<JobListMlAnomalyAlertFlyoutProps> = ({
  setShowFunction,
  unsetShowFunction,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [jobId, setJobId] = useState<JobId | undefined>();

  const showFlyoutCallback = useCallback((jobIdUpdate: JobId) => {
    setJobId(jobIdUpdate);
    setIsVisible(true);
  }, []);

  useEffect(() => {
    setShowFunction(showFlyoutCallback);
    return () => {
      unsetShowFunction();
    };
  }, []);

  return isVisible && jobId ? (
    <MlAnomalyAlertFlyout
      jobIds={[jobId]}
      onCloseFlyout={() => setIsVisible(false)}
      onSave={() => {
        setIsVisible(false);
      }}
    />
  ) : null;
};
