/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';

import { Rule } from '../../../triggers_actions_ui/public';
import { JobId } from '../../common/types/anomaly_detection_jobs';
import { useMlKibana } from '../application/contexts/kibana';
import { ML_ALERT_TYPES } from '../../common/constants/alerts';
import { PLUGIN_ID } from '../../common/constants/app';
import { MlAnomalyDetectionAlertRule } from '../../common/types/alerts';

interface MlAnomalyAlertFlyoutProps {
  initialAlert?: MlAnomalyDetectionAlertRule & Rule;
  jobIds?: JobId[];
  onSave?: () => void;
  onCloseFlyout: () => void;
}

/**
 * Invoke alerting flyout from the ML plugin context.
 * @param initialAlert
 * @param jobIds
 * @param onCloseFlyout
 * @param onSave
 * @constructor
 */
export const MlAnomalyAlertFlyout: FC<MlAnomalyAlertFlyoutProps> = ({
  initialAlert,
  jobIds,
  onCloseFlyout,
  onSave,
}) => {
  const {
    services: { triggersActionsUi },
  } = useMlKibana();

  const AlertFlyout = useMemo(() => {
    if (!triggersActionsUi) return;

    const commonProps = {
      onClose: () => {
        onCloseFlyout();
      },
      onSave: async () => {
        if (onSave) {
          onSave();
        }
      },
    };

    if (initialAlert) {
      return triggersActionsUi.getEditAlertFlyout({
        ...commonProps,
        initialRule: {
          ...initialAlert,
          ruleTypeId: initialAlert.ruleTypeId ?? initialAlert.alertTypeId,
        },
      });
    }

    return triggersActionsUi.getAddAlertFlyout({
      ...commonProps,
      consumer: PLUGIN_ID,
      canChangeTrigger: false,
      ruleTypeId: ML_ALERT_TYPES.ANOMALY_DETECTION,
      metadata: {},
      initialValues: {
        params: {
          jobSelection: {
            jobIds,
          },
        },
      },
    });
    // deps on id to avoid re-rendering on auto-refresh
  }, [triggersActionsUi, initialAlert?.id, jobIds]);

  return <>{AlertFlyout}</>;
};

interface JobListMlAnomalyAlertFlyoutProps {
  setShowFunction: (callback: Function) => void;
  unsetShowFunction: () => void;
  onSave: () => void;
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
  onSave,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [jobIds, setJobIds] = useState<JobId[] | undefined>();

  const showFlyoutCallback = useCallback((jobIdsUpdate: JobId[]) => {
    setJobIds(jobIdsUpdate);
    setIsVisible(true);
  }, []);

  useEffect(() => {
    setShowFunction(showFlyoutCallback);
    return () => {
      unsetShowFunction();
    };
  }, []);

  return isVisible && jobIds ? (
    <MlAnomalyAlertFlyout
      jobIds={jobIds}
      onCloseFlyout={() => setIsVisible(false)}
      onSave={() => {
        setIsVisible(false);
        onSave();
      }}
    />
  ) : null;
};

interface EditRuleFlyoutProps {
  initialAlert: MlAnomalyDetectionAlertRule & Rule;
  onSave: () => void;
}

export const EditAlertRule: FC<EditRuleFlyoutProps> = ({ initialAlert, onSave }) => {
  const [isVisible, setIsVisible] = useState(false);
  return (
    <>
      <EuiButtonEmpty size="xs" onClick={setIsVisible.bind(null, !isVisible)}>
        {initialAlert.name}
      </EuiButtonEmpty>

      {isVisible ? (
        <MlAnomalyAlertFlyout
          initialAlert={initialAlert}
          onCloseFlyout={setIsVisible.bind(null, false)}
          onSave={() => {
            setIsVisible(false);
            onSave();
          }}
        />
      ) : null}
    </>
  );
};
