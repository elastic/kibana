/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiTitle,
  EuiText,
  EuiIcon,
  EuiSpacer,
  EuiInMemoryTable,
} from '@elastic/eui';

import {
  SystemIndicesUpgradeStatus,
  SystemIndicesUpgradeFeature,
  UPGRADE_STATUS,
} from '../../../../../common/types';

export interface SystemIndicesFlyoutProps {
  closeFlyout: () => void;
  data: SystemIndicesUpgradeStatus;
}

const i18nTexts = {
  closeButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.overview.system_indices.flyoutCloseButtonLabel',
    {
      defaultMessage: 'Close',
    }
  ),
  flyoutTitle: i18n.translate('xpack.upgradeAssistant.overview.system_indices.flyoutTitle', {
    defaultMessage: 'Upgrade system indices',
  }),
  flyoutDescription: i18n.translate(
    'xpack.upgradeAssistant.overview.system_indices.flyoutDescription',
    {
      defaultMessage:
        'Migrate your system indices to keep them happy. In addition to regular checkups, it is recommended that you brush and floss your indices twice per day.',
    }
  ),
  upgradeCompleteLabel: i18n.translate(
    'xpack.upgradeAssistant.overview.system_indices.upgradeCompleteLabel',
    {
      defaultMessage: 'Upgrade complete',
    }
  ),
  needsUpgradingLabel: i18n.translate(
    'xpack.upgradeAssistant.overview.system_indices.needsUpgradingLabel',
    {
      defaultMessage: 'Requires upgrading',
    }
  ),
  upgradingLabel: i18n.translate('xpack.upgradeAssistant.overview.system_indices.upgradingLabel', {
    defaultMessage: 'Upgrading…',
  }),
  errorLabel: i18n.translate('xpack.upgradeAssistant.overview.system_indices.errorLabel', {
    defaultMessage: 'Error: TODO',
  }),
};

const renderMigrationStatus = (status: UPGRADE_STATUS) => {
  if (status === 'NO_UPGRADE_NEEDED') {
    return (
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiIcon type="checkInCircleFilled" color="success" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText color="green" size="s">
            <p>{i18nTexts.upgradeCompleteLabel}</p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (status === 'UPGRADE_NEEDED') {
    return (
      <EuiText size="s">
        <p>{i18nTexts.needsUpgradingLabel}</p>
      </EuiText>
    );
  }

  if (status === 'IN_PROGRESS') {
    return (
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText color="subdued" size="s">
            <p>{i18nTexts.upgradingLabel}</p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiIcon type="alert" color="danger" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText color="danger" size="s">
          <p>{i18nTexts.errorLabel}</p>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const columns = [
  {
    field: 'feature_name',
    name: 'Feature name',
    sortable: true,
    truncateText: true,
  },
  {
    field: 'upgrade_status',
    name: 'Status',
    sortable: true,
    render: renderMigrationStatus,
  },
];

export const SystemIndicesFlyout = ({ closeFlyout, data }: SystemIndicesFlyoutProps) => {
  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s" data-test-subj="flyoutTitle">
          <h2>{i18nTexts.flyoutTitle}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText>
          <p>{i18nTexts.flyoutDescription}</p>
        </EuiText>
        <EuiSpacer size="l" />
        <EuiInMemoryTable<SystemIndicesUpgradeFeature>
          itemId="feature_name"
          items={data.features}
          columns={columns}
          pagination={true}
          sorting={true}
        />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={closeFlyout} flush="left">
              {i18nTexts.closeButtonLabel}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
