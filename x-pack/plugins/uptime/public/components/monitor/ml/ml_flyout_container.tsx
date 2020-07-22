/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  canCreateMLJobSelector,
  hasMLJobSelector,
  hasNewMLJobSelector,
  isMLJobCreatingSelector,
  selectDynamicSettings,
} from '../../../state/selectors';
import {
  createMLJobAction,
  getExistingMLJobAction,
  setAlertFlyoutType,
  setAlertFlyoutVisible,
} from '../../../state/actions';
import { MLJobLink } from './ml_job_link';
import * as labels from './translations';
import { MLFlyoutView } from './ml_flyout';
import { CLIENT_ALERT_TYPES, ML_JOB_ID } from '../../../../common/constants';
import { UptimeRefreshContext, UptimeSettingsContext } from '../../../contexts';
import { useGetUrlParams } from '../../../hooks';
import { getDynamicSettings } from '../../../state/actions/dynamic_settings';
import { useMonitorId } from '../../../hooks';
import { kibanaService } from '../../../state/kibana_service';
import { toMountPoint } from '../../../../../../../src/plugins/kibana_react/public';

interface Props {
  onClose: () => void;
}

const showMLJobNotification = (
  monitorId: string,
  basePath: string,
  range: { to: string; from: string },
  success: boolean,
  error?: Error
) => {
  if (success) {
    kibanaService.toasts.addSuccess(
      {
        title: toMountPoint(
          <p data-test-subj="uptimeMLJobSuccessfullyCreated">{labels.JOB_CREATED_SUCCESS_TITLE}</p>
        ),
        text: toMountPoint(
          <p>
            {labels.JOB_CREATED_SUCCESS_MESSAGE}
            <MLJobLink monitorId={monitorId} basePath={basePath} dateRange={range}>
              {labels.VIEW_JOB}
            </MLJobLink>
          </p>
        ),
      },
      { toastLifeTimeMs: 10000 }
    );
  } else {
    kibanaService.toasts.addError(error!, {
      title: labels.JOB_CREATION_FAILED,
      toastMessage: labels.JOB_CREATION_FAILED_MESSAGE,
      toastLifeTimeMs: 10000,
    });
  }
};

export const MachineLearningFlyout: React.FC<Props> = ({ onClose }) => {
  const dispatch = useDispatch();
  const { data: hasMLJob, error } = useSelector(hasNewMLJobSelector);
  const isMLJobCreating = useSelector(isMLJobCreatingSelector);
  const { settings } = useSelector(selectDynamicSettings);
  useEffect(() => {
    // Attempt to load or refresh the dynamic settings
    dispatch(getDynamicSettings({}));
  }, [dispatch]);
  const heartbeatIndices = settings?.heartbeatIndices || '';
  const { basePath } = useContext(UptimeSettingsContext);

  const { refreshApp } = useContext(UptimeRefreshContext);

  const monitorId = useMonitorId();

  const canCreateMLJob = useSelector(canCreateMLJobSelector) && heartbeatIndices !== '';

  // This function is a noop in the form's disabled state
  const createMLJob = heartbeatIndices
    ? () => dispatch(createMLJobAction.get({ monitorId: monitorId as string, heartbeatIndices }))
    : () => null;

  const { data: uptimeJobs } = useSelector(hasMLJobSelector);

  const hasExistingMLJob = !!uptimeJobs?.jobsExist;

  const [isCreatingJob, setIsCreatingJob] = useState(false);

  const { dateRangeStart, dateRangeEnd } = useGetUrlParams();

  useEffect(() => {
    if (isCreatingJob && !isMLJobCreating) {
      if (hasMLJob) {
        showMLJobNotification(
          monitorId as string,
          basePath,
          { to: dateRangeEnd, from: dateRangeStart },
          true
        );
        const loadMLJob = (jobId: string) =>
          dispatch(getExistingMLJobAction.get({ monitorId: monitorId as string }));

        loadMLJob(ML_JOB_ID);

        refreshApp();
        dispatch(setAlertFlyoutType(CLIENT_ALERT_TYPES.DURATION_ANOMALY));
        dispatch(setAlertFlyoutVisible(true));
      } else {
        showMLJobNotification(
          monitorId as string,
          basePath,
          { to: dateRangeEnd, from: dateRangeStart },
          false,
          error as Error
        );
      }
      setIsCreatingJob(false);
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMLJob, onClose, isCreatingJob, error, isMLJobCreating, monitorId, dispatch, basePath]);

  useEffect(() => {
    if (hasExistingMLJob && !isMLJobCreating && !hasMLJob && heartbeatIndices) {
      setIsCreatingJob(true);
      dispatch(createMLJobAction.get({ monitorId: monitorId as string, heartbeatIndices }));
    }

    // Don't add isMLJobCreating, because it will result int end less loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, hasExistingMLJob, heartbeatIndices, monitorId, hasMLJob]);

  if (hasExistingMLJob) {
    return null;
  }

  const createAnomalyJob = () => {
    setIsCreatingJob(true);
    createMLJob();
  };

  return (
    <MLFlyoutView
      canCreateMLJob={!!canCreateMLJob}
      isCreatingJob={isMLJobCreating}
      onClickCreate={createAnomalyJob}
      onClose={onClose}
    />
  );
};
