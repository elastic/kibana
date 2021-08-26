/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
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

import { CloudBackupStatus } from '../../../../../common/types';
import { UseRequestResponse } from '../../../../shared_imports';
import { ResponseError } from '../../../lib/api';

export type CloudBackupStatusResponse = UseRequestResponse<CloudBackupStatus, ResponseError>;

interface Props {
  cloudBackupStatusResponse: UseRequestResponse<CloudBackupStatus, ResponseError>;
  cloudSnapshotsUrl: string;
}

export const CloudBackup: React.FunctionComponent<Props> = ({
  cloudBackupStatusResponse,
  cloudSnapshotsUrl,
}) => {
  const { isInitialRequest, isLoading, error, data, resendRequest } = cloudBackupStatusResponse;

  if (isInitialRequest && isLoading) {
    return <EuiLoadingContent lines={3} />;
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
    <EuiFlexGroup alignItems="center" gutterSize="s">
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
    <EuiFlexGroup alignItems="center" gutterSize="s">
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
