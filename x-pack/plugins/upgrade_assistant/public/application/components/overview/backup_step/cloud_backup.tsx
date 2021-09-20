/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import moment from 'moment-timezone';
import { FormattedDate, FormattedTime, FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
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

import { useAppContext } from '../../../app_context';

interface Props {
  cloudSnapshotsUrl: string;
  setIsComplete: (isComplete: boolean) => void;
}

export const CloudBackup: React.FunctionComponent<Props> = ({
  cloudSnapshotsUrl,
  setIsComplete,
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
    }
    // Depending upon setIsComplete would create an infinite loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error, isLoading, data]);

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

      <EuiButton
        href={cloudSnapshotsUrl}
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
