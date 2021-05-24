/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useRef } from 'react';
import { i18n } from '@kbn/i18n';

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
} from '@elastic/eui';
import { useAppContext } from '../../../../app_context';
interface Props {
  children: (
    fixSnapshotsPrompt: ({
      jobId,
      snapshotId,
      description,
    }: {
      jobId: string;
      snapshotId: string;
      description: string;
    }) => void,
    successfulRequests: { [key: string]: boolean }
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
  secondaryFlyoutDescription: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.mlSnapshots.flyout.secondaryDescription',
    {
      defaultMessage: 'Upgrade or delete your model snapshot to resolve.',
    }
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
  const [successfulRequests, setSuccessfulRequests] = useState<{ [key: string]: boolean }>({});

  const jobId = useRef<string | undefined>(undefined);
  const snapshotId = useRef<string | undefined>(undefined);
  const description = useRef<string | undefined>(undefined);

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
      setSuccessfulRequests({
        [snapshotId.current!]: true,
      });
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
      setSuccessfulRequests({
        [snapshotId.current!]: true,
      });
      notifications.toasts.addSuccess(i18nTexts.deleteSuccessNotificationText);
    }
  };

  const closeFlyout = () => setIsFlyoutOpen(false);

  const fixSnapshotsPrompt = ({
    jobId: currentJobId,
    snapshotId: currentSnapshotId,
    description: currentDescription,
  }: {
    jobId: string;
    snapshotId: string;
    description: string;
  }) => {
    setIsFlyoutOpen(true);
    setSuccessfulRequests({
      [currentSnapshotId]: false,
    });
    jobId.current = currentJobId;
    snapshotId.current = currentSnapshotId;
    description.current = currentDescription;
  };

  return (
    <>
      {children(fixSnapshotsPrompt, successfulRequests)}

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
                <p>{description.current!}</p>
                <p>{i18nTexts.secondaryFlyoutDescription}</p>
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
