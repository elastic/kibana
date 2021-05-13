/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiPortal,
  EuiTitle,
  EuiText,
  EuiCode,
} from '@elastic/eui';
import { useAppContext } from '../../../../app_context';

interface Props {
  children: (
    upgradeSnapshotsPrompt: ({ jobId, snapshotId }: { jobId: string; snapshotId: string }) => void
  ) => React.ReactNode;
}

const i18nTexts = {
  upgradeButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.mlSnapshots.flyout.upgradeButtonLabel',
    {
      defaultMessage: 'Upgrade',
    }
  ),
  cancelButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.mlSnapshots.flyout.cancelButtonLabel',
    {
      defaultMessage: 'Cancel',
    }
  ),
  flyoutTitle: i18n.translate('xpack.upgradeAssistant.esDeprecations.mlSnapshots.flyout.title', {
    defaultMessage: 'Upgrade model snapshot',
  }),
  primaryFlyoutDescription: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.mlSnapshots.flyout.primaryDescription',
    {
      defaultMessage:
        'Over time, older snapshot formats are deprecated and removed. Anomaly detection jobs support only snapshots that are from the current or previous major version.',
    }
  ),
  getSecondaryFlyoutDescription: ({ jobId, snapshotId }: { jobId: string; snapshotId: string }) => (
    <FormattedMessage
      id="xpack.upgradeAssistant.esDeprecations.mlSnapshots.flyout.secondaryDescription"
      defaultMessage="The Upgrade Assistant will upgrade snapshot {snapshotId} for job {jobId} to the current major version."
      values={{
        snapshotId: <EuiCode>{snapshotId}</EuiCode>,
        jobId: <EuiCode>{jobId}</EuiCode>,
      }}
    />
  ),
  successNotificationText: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.mlSnapshots.flyout.successNotificationText',
    {
      defaultMessage: 'Snapshot upgraded',
    }
  ),
  errorNotificationText: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.mlSnapshots.flyout.errorNotificationText',
    {
      defaultMessage: 'Error upgrading snapshot',
    }
  ),
};

export const UpgradeSnapshotsProvider = ({ children }: Props) => {
  const [isFlyoutOpen, setIsFlyoutOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const jobId = useRef<string | undefined>(undefined);
  const snapshotId = useRef<string | undefined>(undefined);

  const { api, notifications } = useAppContext();

  const upgradeMlSnapshots = async () => {
    setIsLoading(true);

    const { error } = await api.upgradeMlSnapshots({
      snapshotId: snapshotId.current!,
      jobId: jobId.current!,
    });

    setIsLoading(false);
    closeFlyout();

    if (error) {
      notifications.toasts.addDanger(i18nTexts.errorNotificationText);
    } else {
      notifications.toasts.addSuccess(i18nTexts.successNotificationText);
    }
  };

  const closeFlyout = () => setIsFlyoutOpen(false);

  const upgradeSnapshotsPrompt = ({
    jobId: currentJobId,
    snapshotId: currentSnapshotId,
  }: {
    jobId: string;
    snapshotId: string;
  }) => {
    setIsFlyoutOpen(true);
    jobId.current = currentJobId;
    snapshotId.current = currentSnapshotId;
  };

  return (
    <>
      {children(upgradeSnapshotsPrompt)}

      {isFlyoutOpen && (
        <EuiPortal>
          <EuiFlyout onClose={closeFlyout} ownFocus size="m" maxWidth>
            <EuiFlyoutHeader hasBorder>
              <EuiTitle size="s">
                <h2>{i18nTexts.flyoutTitle}</h2>
              </EuiTitle>
            </EuiFlyoutHeader>
            <EuiFlyoutBody>
              <EuiText>
                <p>{i18nTexts.primaryFlyoutDescription}</p>
                <p>
                  {i18nTexts.getSecondaryFlyoutDescription({
                    jobId: jobId.current!,
                    snapshotId: snapshotId.current!,
                  })}
                </p>
              </EuiText>
            </EuiFlyoutBody>
            <EuiFlyoutFooter>
              <EuiFlexGroup justifyContent="spaceBetween">
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty iconType="cross" onClick={closeFlyout} flush="left">
                    {i18nTexts.cancelButtonLabel}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton fill onClick={upgradeMlSnapshots} isLoading={isLoading}>
                    {i18nTexts.upgradeButtonLabel}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlyoutFooter>
          </EuiFlyout>
        </EuiPortal>
      )}
    </>
  );
};
