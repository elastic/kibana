/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiFlexItem,
  EuiText,
  EuiFlexGroup,
  EuiIcon,
  EuiLoadingSpinner,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Status } from '../../../types';

const i18nTexts = {
  deleteInProgressText: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.clusterSettings.deletingButtonLabel',
    {
      defaultMessage: 'Settings removal in progress…',
    }
  ),
  deleteCompleteText: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.clusterSettings.deleteCompleteText',
    {
      defaultMessage: 'Deprecated settings removed',
    }
  ),
  deleteFailedText: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.clusterSettings.deleteFailedText',
    {
      defaultMessage: 'Settings removal failed',
    }
  ),
  resolutionText: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.clusterSettings.resolutionText',
    {
      defaultMessage: 'Remove settings',
    }
  ),
  resolutionTooltipLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.clusterSettings.resolutionTooltipLabel',
    {
      defaultMessage:
        'Resolve this issue by removing settings from this cluster. This issue can be resolved automatically.',
    }
  ),
};

interface Props {
  status: {
    statusType: Status;
  };
}

export const ClusterSettingsResolutionCell: React.FunctionComponent<Props> = ({ status }) => {
  const { statusType } = status;
  if (statusType === 'in_progress') {
    return (
      <EuiFlexGroup
        gutterSize="s"
        alignItems="center"
        data-test-subj="clusterSettingsResolutionStatusCell"
      >
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">{i18nTexts.deleteInProgressText}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (statusType === 'complete') {
    return (
      <EuiFlexGroup
        gutterSize="s"
        alignItems="center"
        data-test-subj="clusterSettingsResolutionStatusCell"
      >
        <EuiFlexItem grow={false}>
          <EuiIcon type="check" color="success" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">{i18nTexts.deleteCompleteText}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (statusType === 'error') {
    return (
      <EuiFlexGroup
        gutterSize="s"
        alignItems="center"
        data-test-subj="clusterSettingsResolutionStatusCell"
      >
        <EuiFlexItem grow={false}>
          <EuiIcon type="alert" color="danger" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">{i18nTexts.deleteFailedText}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiToolTip position="top" content={i18nTexts.resolutionTooltipLabel}>
      <EuiFlexGroup
        gutterSize="s"
        alignItems="center"
        data-test-subj="clusterSettingsResolutionStatusCell"
      >
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
