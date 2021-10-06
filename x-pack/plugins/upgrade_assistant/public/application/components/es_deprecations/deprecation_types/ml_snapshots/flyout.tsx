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
  retryUpgradeButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.mlSnapshots.flyout.retryUpgradeButtonLabel',
    {
      defaultMessage: 'Retry upgrade',
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

export const FixSnapshotsFlyout = ({
  deprecation,
  closeFlyout,
  snapshotState,
  upgradeSnapshot,
  deleteSnapshot,
}: FixSnapshotsFlyoutProps) => {
  // Flag used to hide certain parts of the UI if the deprecation has been resolved or is in progress
  const isResolvable = ['idle', 'error'].includes(snapshotState.status);

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

          {isResolvable && (
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
          )}
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
