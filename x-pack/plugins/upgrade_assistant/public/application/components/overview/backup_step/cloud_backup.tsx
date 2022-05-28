/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import moment from 'moment-timezone';
import { FormattedDate, FormattedTime, FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { METRIC_TYPE } from '@kbn/analytics';
import {
  EuiLoadingContent,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  EuiButton,
  EuiSpacer,
  EuiCallOut,
} from '@elastic/eui';

import { CLOUD_SNAPSHOT_REPOSITORY } from '../../../../../common/constants';
import { useAppContext } from '../../../app_context';
import { ResponseError } from '../../../../../common/types';
import { uiMetricService, UIM_BACKUP_DATA_CLOUD_CLICK } from '../../../lib/ui_metric';

interface Props {
  cloudSnapshotsUrl: string;
  setIsComplete: (isComplete: boolean) => void;
  setForceOnPremStep: (forceOnPrem: boolean) => void;
}

const isMissingFoundSnapshotsRepo = (error: ResponseError) => {
  return error.statusCode === 404 && error.message.toString().includes(CLOUD_SNAPSHOT_REPOSITORY);
};

export const CloudBackup: React.FunctionComponent<Props> = ({
  cloudSnapshotsUrl,
  setIsComplete,
  setForceOnPremStep,
}) => {
  const {
    services: { api },
  } = useAppContext();

  const { isInitialRequest, isLoading, error, data, resendRequest } =
    api.useLoadCloudBackupStatus();

  // Tell overview whether the step is complete or not.
  useEffect(() => {
    // Loading shouldn't invalidate the previous state.
    if (!isLoading) {
      // An error should invalidate the previous state.
      setIsComplete((!error && data?.isBackedUp) ?? false);
      // If snapshots are not enabled, as it could happen in an ECE installation, the
      // cloud backup status api will return a 404 error saying that the found-snapshots
      // repository is missing. If that were to happen, we should force the users to see
      // the on prem backup step instead.
      if (error && isMissingFoundSnapshotsRepo(error)) {
        setForceOnPremStep(true);
      }
    }

    // Depending upon setIsComplete would create an infinite loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error, isLoading, data, setForceOnPremStep]);

  if (isInitialRequest && isLoading) {
    return <EuiLoadingContent data-test-subj="cloudBackupLoading" lines={3} />;
  }

  if (error) {
    return (
      <EuiCallOut
        title={i18n.translate('xpack.upgradeAssistant.overview.cloudBackup.loadingError', {
          defaultMessage: 'An error occurred while retrieving the latest snapshot status',
        })}
        color="danger"
        iconType="alert"
        data-test-subj="cloudBackupErrorCallout"
      >
        <p>
          {error.statusCode} - {error.message}
        </p>
        <EuiButton color="danger" onClick={resendRequest} data-test-subj="cloudBackupRetryButton">
          {i18n.translate('xpack.upgradeAssistant.overview.cloudBackup.retryButton', {
            defaultMessage: 'Try again',
          })}
        </EuiButton>
      </EuiCallOut>
    );
  }

  const lastBackupTime = moment(data!.lastBackupTime).toISOString();

  const statusMessage = data!.isBackedUp ? (
    <EuiFlexGroup alignItems="center" gutterSize="s" data-test-subj="dataBackedUpStatus">
      <EuiFlexItem grow={false}>
        <EuiIcon type="check" color="success" />
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.upgradeAssistant.overview.cloudBackup.hasSnapshotMessage"
              defaultMessage="Last snapshot created on {lastBackupTime}."
              values={{
                lastBackupTime: (
                  <>
                    <FormattedDate
                      value={lastBackupTime}
                      year="numeric"
                      month="long"
                      day="2-digit"
                    />{' '}
                    <FormattedTime value={lastBackupTime} timeZoneName="short" hour12={false} />
                  </>
                ),
              }}
            />
          </p>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : (
    <EuiFlexGroup alignItems="center" gutterSize="s" data-test-subj="dataNotBackedUpStatus">
      <EuiFlexItem grow={false}>
        <EuiIcon type="alert" color="danger" />
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiText>
          <p>
            {i18n.translate('xpack.upgradeAssistant.overview.cloudBackup.noSnapshotMessage', {
              defaultMessage: `Your data isn't backed up.`,
            })}
          </p>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <>
      {statusMessage}
      <EuiSpacer size="s" />
      {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
      <EuiButton
        href={cloudSnapshotsUrl}
        onClick={() => {
          uiMetricService.trackUiMetric(METRIC_TYPE.CLICK, UIM_BACKUP_DATA_CLOUD_CLICK);
        }}
        data-test-subj="cloudSnapshotsLink"
        target="_blank"
        iconType="popout"
        iconSide="right"
      >
        <FormattedMessage
          id="xpack.upgradeAssistant.overview.cloudBackup.snapshotsLink"
          defaultMessage="Create snapshot"
        />
      </EuiButton>
    </>
  );
};
