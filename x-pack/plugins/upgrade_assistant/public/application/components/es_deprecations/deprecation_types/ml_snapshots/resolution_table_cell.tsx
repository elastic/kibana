/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiToolTip,
  EuiFlexItem,
  EuiText,
  EuiFlexGroup,
  EuiIcon,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useMlSnapshotContext } from './context';

const i18nTexts = {
  upgradeInProgressText: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.mlSnapshots.upgradeInProgressText',
    {
      defaultMessage: 'Upgrade in progress…',
    }
  ),
  deleteInProgressText: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.mlSnapshots.deletingButtonLabel',
    {
      defaultMessage: 'Deletion in progress…',
    }
  ),
  upgradeCompleteText: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.mlSnapshots.upgradeCompleteText',
    {
      defaultMessage: 'Upgrade complete',
    }
  ),
  deleteCompleteText: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.mlSnapshots.deleteCompleteText',
    {
      defaultMessage: 'Deletion complete',
    }
  ),
  upgradeFailedText: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.mlSnapshots.upgradeFailedText',
    {
      defaultMessage: 'Upgrade failed',
    }
  ),
  deleteFailedText: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.mlSnapshots.deleteFailedText',
    {
      defaultMessage: 'Deletion failed',
    }
  ),
  resolutionText: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.mlSnapshots.resolutionText',
    {
      defaultMessage: 'Upgrade or delete snapshots',
    }
  ),
  resolutionTooltipLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.mlSnapshots.resolutionTooltipLabel',
    {
      defaultMessage:
        'Resolve this issue by upgrading or deleting a job model snapshot. This issue can be resolved automatically.',
    }
  ),
};

export const MlSnapshotsResolutionCell: React.FunctionComponent = () => {
  const { snapshotState } = useMlSnapshotContext();

  if (snapshotState.status === 'in_progress') {
    return (
      <EuiFlexGroup gutterSize="s" alignItems="center" data-test-subj="mlActionResolutionCell">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            {snapshotState.action === 'delete'
              ? i18nTexts.deleteInProgressText
              : i18nTexts.upgradeInProgressText}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (snapshotState.status === 'complete') {
    return (
      <EuiFlexGroup gutterSize="s" alignItems="center" data-test-subj="mlActionResolutionCell">
        <EuiFlexItem grow={false}>
          <EuiIcon type="check" color="success" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            {snapshotState.action === 'delete'
              ? i18nTexts.deleteCompleteText
              : i18nTexts.upgradeCompleteText}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (snapshotState.status === 'error') {
    return (
      <EuiFlexGroup gutterSize="s" alignItems="center" data-test-subj="mlActionResolutionCell">
        <EuiFlexItem grow={false}>
          <EuiIcon type="alert" color="danger" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            {snapshotState.action === 'delete'
              ? i18nTexts.deleteFailedText
              : i18nTexts.upgradeFailedText}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiToolTip position="top" content={i18nTexts.resolutionTooltipLabel}>
      <EuiFlexGroup gutterSize="s" alignItems="center" data-test-subj="mlActionResolutionCell">
        <EuiFlexItem grow={false}>
          <EuiIcon type="indexSettings" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">{i18nTexts.resolutionText}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiToolTip>
  );
};
