/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
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
  EuiCallOut,
  EuiSpacer,
} from '@elastic/eui';
import { SnapshotStatus } from './use_snapshot_state';
import { ResponseError } from '../../../../lib/api';

interface SnapshotState extends SnapshotStatus {
  error?: ResponseError;
}
interface Props {
  upgradeSnapshot: () => Promise<void>;
  deleteSnapshot: () => Promise<void>;
  description: string;
  closeFlyout: () => void;
  snapshotState: SnapshotState;
}

const i18nTexts = {
  upgradeButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.mlSnapshots.flyout.upgradeButtonLabel',
    {
      defaultMessage: 'Upgrade',
    }
  ),
  retryUpgradeButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.mlSnapshots.flyout.retryUpgradeButtonLabel',
    {
      defaultMessage: 'Retry upgrade',
    }
  ),
  closeButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.mlSnapshots.flyout.cancelButtonLabel',
    {
      defaultMessage: 'Close',
    }
  ),
  deleteButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.mlSnapshots.flyout.deleteButtonLabel',
    {
      defaultMessage: 'Delete',
    }
  ),
  retryDeleteButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.mlSnapshots.flyout.retryDeleteButtonLabel',
    {
      defaultMessage: 'Retry delete',
    }
  ),
  flyoutTitle: i18n.translate('xpack.upgradeAssistant.esDeprecations.mlSnapshots.flyout.title', {
    defaultMessage: 'Upgrade or delete model snapshot',
  }),
  deleteSnapshotErrorTitle: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.mlSnapshots.flyout.deleteSnapshotErrorTitle',
    {
      defaultMessage: 'Error deleting snapshot',
    }
  ),
  upgradeSnapshotErrorTitle: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.mlSnapshots.flyout.upgradeSnapshotErrorTitle',
    {
      defaultMessage: 'Error upgrading snapshot',
    }
  ),
};

export const FixSnapshotsFlyout = ({
  upgradeSnapshot,
  deleteSnapshot,
  description,
  closeFlyout,
  snapshotState,
}: Props) => {
  const onUpgradeSnapshot = () => {
    upgradeSnapshot();
    closeFlyout();
  };

  const onDeleteSnapshot = () => {
    deleteSnapshot();
    closeFlyout();
  };

  return (
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
          {snapshotState.error && (
            <>
              <EuiCallOut
                title={
                  snapshotState.action === 'delete'
                    ? i18nTexts.deleteSnapshotErrorTitle
                    : i18nTexts.upgradeSnapshotErrorTitle
                }
                color="danger"
                iconType="alert"
                data-test-subj="upgradeSnapshotError"
              >
                {snapshotState.error.message}
              </EuiCallOut>
              <EuiSpacer />
            </>
          )}
          <EuiText>
            <p>{description}</p>
          </EuiText>
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty iconType="cross" onClick={closeFlyout} flush="left">
                {i18nTexts.closeButtonLabel}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiButtonEmpty
                    data-test-subj="deleteSnapshotButton"
                    color="danger"
                    onClick={onDeleteSnapshot}
                    isLoading={false}
                  >
                    {snapshotState.action === 'delete' && snapshotState.error
                      ? i18nTexts.retryDeleteButtonLabel
                      : i18nTexts.deleteButtonLabel}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiButton
                    fill
                    onClick={onUpgradeSnapshot}
                    isLoading={false}
                    data-test-subj="upgradeSnapshotButton"
                  >
                    {snapshotState.action === 'upgrade' && snapshotState.error
                      ? i18nTexts.retryUpgradeButtonLabel
                      : i18nTexts.upgradeButtonLabel}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    </EuiPortal>
  );
};
