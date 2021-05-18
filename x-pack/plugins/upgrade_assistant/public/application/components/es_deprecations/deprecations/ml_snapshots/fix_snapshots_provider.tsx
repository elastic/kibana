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
    fixSnapshotsPrompt: ({ jobId, snapshotId }: { jobId: string; snapshotId: string }) => void
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
  deleteButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.mlSnapshots.flyout.deleteButtonLabel',
    {
      defaultMessage: 'Delete',
    }
  ),
  flyoutTitle: i18n.translate('xpack.upgradeAssistant.esDeprecations.mlSnapshots.flyout.title', {
    defaultMessage: 'Upgrade or delete model snapshot',
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
      defaultMessage="Please upgrade or delete snapshot {snapshotId} for job {jobId}."
      values={{
        snapshotId: <EuiCode>{snapshotId}</EuiCode>,
        jobId: <EuiCode>{jobId}</EuiCode>,
      }}
    />
  ),
  upgradeSuccessNotificationText: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.mlSnapshots.flyout.upgradeSuccessNotificationText',
    {
      defaultMessage: 'Snapshot upgraded',
    }
  ),
  upgradeErrorNotificationText: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.mlSnapshots.flyout.upgradeErrorNotificationText',
    {
      defaultMessage: 'Error upgrading snapshot',
    }
  ),
  deleteSuccessNotificationText: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.mlSnapshots.flyout.deleteSuccessNotificationText',
    {
      defaultMessage: 'Snapshot deleted',
    }
  ),
  deleteErrorNotificationText: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.mlSnapshots.flyout.deleteErrorNotificationText',
    {
      defaultMessage: 'Error deleting snapshot',
    }
  ),
};

export const FixSnapshotsProvider = ({ children }: Props) => {
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const [isUpgradingSnapshot, setIsUpgradingSnapshot] = useState(false);
  const [isDeletingSnapshot, setIsDeletingSnapshot] = useState(false);

  const jobId = useRef<string | undefined>(undefined);
  const snapshotId = useRef<string | undefined>(undefined);

  const { api, notifications } = useAppContext();

  const upgradeMlSnapshot = async () => {
    setIsUpgradingSnapshot(true);

    const { error } = await api.upgradeMlSnapshot({
      snapshotId: snapshotId.current!,
      jobId: jobId.current!,
    });

    setIsUpgradingSnapshot(false);
    closeFlyout();

    if (error) {
      notifications.toasts.addDanger(i18nTexts.upgradeErrorNotificationText);
    } else {
      notifications.toasts.addSuccess(i18nTexts.upgradeSuccessNotificationText);
    }
  };

  const deleteMlSnapshot = async () => {
    setIsDeletingSnapshot(true);

    const { error } = await api.deleteMlSnapshot({
      snapshotId: snapshotId.current!,
      jobId: jobId.current!,
    });

    setIsDeletingSnapshot(false);
    closeFlyout();

    if (error) {
      notifications.toasts.addDanger(i18nTexts.deleteErrorNotificationText);
    } else {
      notifications.toasts.addSuccess(i18nTexts.deleteSuccessNotificationText);
    }
  };

  const closeFlyout = () => setIsFlyoutOpen(false);

  const fixSnapshotsPrompt = ({
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
      {children(fixSnapshotsPrompt)}

      {isFlyoutOpen && (
        <EuiPortal>
          <EuiFlyout
            onClose={closeFlyout}
            ownFocus
            size="m"
            maxWidth
            data-test-subj="fixSnapshotsFlyout"
          >
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
                  <EuiFlexGroup>
                    <EuiFlexItem>
                      <EuiButtonEmpty
                        data-test-subj="deleteSnapshotButton"
                        color="danger"
                        onClick={deleteMlSnapshot}
                        isLoading={isDeletingSnapshot}
                      >
                        {i18nTexts.deleteButtonLabel}
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiButton
                        fill
                        onClick={upgradeMlSnapshot}
                        isLoading={isUpgradingSnapshot}
                        data-test-subj="upgradeSnapshotButton"
                      >
                        {i18nTexts.upgradeButtonLabel}
                      </EuiButton>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlyoutFooter>
          </EuiFlyout>
        </EuiPortal>
      )}
    </>
  );
};
