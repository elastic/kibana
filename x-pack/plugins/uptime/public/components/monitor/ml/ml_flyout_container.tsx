/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  canCreateMLJobSelector,
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
import { ML_JOB_ID } from '../../../../common/constants';
import { UptimeRefreshContext, UptimeSettingsContext } from '../../../contexts';
import { useGetUrlParams } from '../../../hooks';
import { getDynamicSettings } from '../../../state/actions/dynamic_settings';
import { useMonitorId } from '../../../hooks';
import { kibanaService } from '../../../state/kibana_service';
import { toMountPoint } from '../../../../../../../src/plugins/kibana_react/public';
import { CLIENT_ALERT_TYPES } from '../../../../common/constants/alerts';
import { TimeRange } from './job_config/job_config';

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

  const createAnomalyJob = ({
    timeRange,
    bucketSpan,
  }: {
    timeRange: TimeRange;
    bucketSpan: string;
  }) => {
    setIsCreatingJob(true);
    dispatch(
      createMLJobAction.get({
        bucketSpan,
        timeRange,
        heartbeatIndices,
        monitorId: monitorId as string,
      })
    );
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
