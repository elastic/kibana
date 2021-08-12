/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexItem, EuiText, EuiFlexGroup, EuiIcon, EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Status } from '../../../types';

const i18nTexts = {
  deleteInProgressText: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.indexSettings.deletingButtonLabel',
    {
      defaultMessage: 'Settings removal in progress…',
    }
  ),
  deleteCompleteText: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.indexSettings.deleteCompleteText',
    {
      defaultMessage: 'Deprecated settings removed',
    }
  ),
  deleteFailedText: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.indexSettings.deleteFailedText',
    {
      defaultMessage: 'Settings removal failed',
    }
  ),
};

interface Props {
  status: {
    statusType: Status;
  };
}

export const IndexSettingsStatusCell: React.FunctionComponent<Props> = ({ status }) => {
  const { statusType } = status;
  if (statusType === 'in_progress') {
    return (
      <EuiFlexGroup
        gutterSize="s"
        alignItems="center"
        data-test-subj="indexSettingsActionStatusCell"
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
        data-test-subj="indexSettingsActionStatusCell"
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
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiIcon type="alert" color="danger" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">{i18nTexts.deleteFailedText}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return <>{''}</>;
};
