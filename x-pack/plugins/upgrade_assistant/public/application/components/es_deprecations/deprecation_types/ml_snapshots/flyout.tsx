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
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
  EuiText,
  EuiCallOut,
  EuiSpacer,
  EuiLink,
} from '@elastic/eui';

import { EnrichedDeprecationInfo } from '../../../../../../common/types';
import { MlSnapshotContext } from './context';
import { SnapshotState } from './use_snapshot_state';

export interface FixSnapshotsFlyoutProps extends MlSnapshotContext {
  deprecation: EnrichedDeprecationInfo;
  closeFlyout: () => void;
}

const i18nTexts = {
  upgradeButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.mlSnapshots.flyout.upgradeButtonLabel',
    {
      defaultMessage: 'Upgrade',
    }
  ),
  upgradingButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.mlSnapshots.flyout.upgradingButtonLabel',
    {
      defaultMessage: 'Upgrading…',
    }
  ),
  retryUpgradeButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.mlSnapshots.flyout.retryUpgradeButtonLabel',
    {
      defaultMessage: 'Retry upgrade',
    }
  ),
  upgradeResolvedButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.mlSnapshots.flyout.deleteResolvupgradeResolvedButtonLabeledButtonLabel',
    {
      defaultMessage: 'Upgrade complete',
    }
  ),
  closeButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.mlSnapshots.flyout.closeButtonLabel',
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
  deletingButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.mlSnapshots.flyout.deletingButtonLabel',
    {
      defaultMessage: 'Deleting…',
    }
  ),
  deleteResolvedButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.mlSnapshots.flyout.deleteResolvedButtonLabel',
    {
      defaultMessage: 'Deletion complete',
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
  learnMoreLinkLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.mlSnapshots.learnMoreLinkLabel',
    {
      defaultMessage: 'Learn more about this deprecation',
    }
  ),
};

const getDeleteButtonLabel = (snapshotState: SnapshotState) => {
  if (snapshotState.action === 'delete') {
    if (snapshotState.error) {
      return i18nTexts.retryDeleteButtonLabel;
    }

    switch (snapshotState.status) {
      case 'in_progress':
        return i18nTexts.deletingButtonLabel;
      case 'complete':
        return i18nTexts.deleteResolvedButtonLabel;
      case 'idle':
      default:
        return i18nTexts.deleteButtonLabel;
    }
  }
  return i18nTexts.deleteButtonLabel;
};

const getUpgradeButtonLabel = (snapshotState: SnapshotState) => {
  if (snapshotState.action === 'upgrade') {
    if (snapshotState.error) {
      return i18nTexts.retryUpgradeButtonLabel;
    }

    switch (snapshotState.status) {
      case 'in_progress':
        return i18nTexts.upgradingButtonLabel;
      case 'complete':
        return i18nTexts.upgradeResolvedButtonLabel;
      case 'idle':
      default:
        return i18nTexts.upgradeButtonLabel;
    }
  }
  return i18nTexts.upgradeButtonLabel;
};

export const FixSnapshotsFlyout = ({
  deprecation,
  closeFlyout,
  snapshotState,
  upgradeSnapshot,
  deleteSnapshot,
}: FixSnapshotsFlyoutProps) => {
  const onUpgradeSnapshot = () => {
    upgradeSnapshot();
    closeFlyout();
  };

  const onDeleteSnapshot = () => {
    deleteSnapshot();
    closeFlyout();
  };

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s" data-test-subj="flyoutTitle">
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
              data-test-subj="resolveSnapshotError"
            >
              {snapshotState.error.message}
            </EuiCallOut>
            <EuiSpacer />
          </>
        )}
        <EuiText>
          <p>{deprecation.details}</p>
          <p>
            <EuiLink target="_blank" href={deprecation.url}>
              {i18nTexts.learnMoreLinkLabel}
            </EuiLink>
          </p>
        </EuiText>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={closeFlyout} flush="left">
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
                  isLoading={
                    snapshotState.action === 'delete' && snapshotState.status === 'in_progress'
                  }
                  disabled={
                    snapshotState.status === 'in_progress' || snapshotState.status === 'complete'
                  }
                >
                  {getDeleteButtonLabel(snapshotState)}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiButton
                  fill
                  onClick={onUpgradeSnapshot}
                  isLoading={
                    snapshotState.action === 'upgrade' && snapshotState.status === 'in_progress'
                  }
                  disabled={
                    snapshotState.status === 'in_progress' || snapshotState.status === 'complete'
                  }
                  data-test-subj="upgradeSnapshotButton"
                >
                  {getUpgradeButtonLabel(snapshotState)}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
