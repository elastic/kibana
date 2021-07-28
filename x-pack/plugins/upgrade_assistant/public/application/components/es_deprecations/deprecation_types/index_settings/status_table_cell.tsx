/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexItem, EuiText, EuiFlexGroup, EuiIcon, EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Status } from './table_row';

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
      defaultMessage: 'Settings removal complete',
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
  status: Status;
}

export const IndexSettingsStatusCell: React.FunctionComponent<Props> = ({ status }) => {
  if (status === 'in_progress') {
    return (
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">{i18nTexts.deleteInProgressText}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (status === 'complete') {
    return (
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiIcon type="check" color="success" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">{i18nTexts.deleteCompleteText}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (status === 'error') {
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
