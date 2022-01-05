/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { METRIC_TYPE } from '@kbn/analytics';

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
import {
  uiMetricService,
  UIM_ML_SNAPSHOT_UPGRADE_CLICK,
  UIM_ML_SNAPSHOT_DELETE_CLICK,
} from '../../../../lib/ui_metric';
import { useAppContext } from '../../../../app_context';
import { DeprecationFlyoutLearnMoreLink, DeprecationBadge } from '../../../shared';
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
  upgradeModeEnabledErrorTitle: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.mlSnapshots.upgradeModeEnabledErrorTitle',
    {
      defaultMessage: 'Machine Learning upgrade mode is enabled',
    }
  ),
  upgradeModeEnabledErrorDescription: (docsLink: string) => (
    <FormattedMessage
      id="xpack.upgradeAssistant.esDeprecations.mlSnapshots.upgradeModeEnabledErrorDescription"
      defaultMessage="No actions can be taken on Machine Learning snapshots while upgrade mode is enabled. {docsLink}."
      values={{
        docsLink: (
          <EuiLink href={docsLink} target="_blank" data-test-subj="setUpgradeModeDocsLink">
            <FormattedMessage
              id="xpack.upgradeAssistant.esDeprecations.mlSnapshots.upgradeModeEnabledDocsLink"
              defaultMessage="Learn more"
            />
          </EuiLink>
        ),
      }}
    />
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
  mlUpgradeModeEnabled,
}: FixSnapshotsFlyoutProps) => {
  const {
    services: {
      core: { docLinks },
    },
  } = useAppContext();
  const isResolved = snapshotState.status === 'complete';

  const onUpgradeSnapshot = () => {
    uiMetricService.trackUiMetric(METRIC_TYPE.CLICK, UIM_ML_SNAPSHOT_UPGRADE_CLICK);
    upgradeSnapshot();
    closeFlyout();
  };

  const onDeleteSnapshot = () => {
    uiMetricService.trackUiMetric(METRIC_TYPE.CLICK, UIM_ML_SNAPSHOT_DELETE_CLICK);
    deleteSnapshot();
    closeFlyout();
  };

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <DeprecationBadge isCritical={deprecation.isCritical} isResolved={isResolved} />
        <EuiSpacer size="s" />
        <EuiTitle size="s" data-test-subj="flyoutTitle">
          <h2 id="mlSnapshotDetailsFlyoutTitle">{i18nTexts.flyoutTitle}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {snapshotState.error && !isResolved && (
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

        {mlUpgradeModeEnabled && (
          <>
            <EuiCallOut
              title={i18nTexts.upgradeModeEnabledErrorTitle}
              color="warning"
              iconType="alert"
              data-test-subj="mlUpgradeModeEnabledError"
            >
              <p>
                {i18nTexts.upgradeModeEnabledErrorDescription(docLinks.links.ml.setUpgradeMode)}
              </p>
            </EuiCallOut>
            <EuiSpacer />
          </>
        )}

        <EuiText>
          <p>{deprecation.details}</p>
          <p>
            <DeprecationFlyoutLearnMoreLink documentationUrl={deprecation.url} />
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

          {!isResolved && !mlUpgradeModeEnabled && (
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
                    isDisabled={snapshotState.status === 'in_progress'}
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
                    isDisabled={snapshotState.status === 'in_progress'}
                    data-test-subj="upgradeSnapshotButton"
                  >
                    {getUpgradeButtonLabel(snapshotState)}
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
