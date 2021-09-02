/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import uuid from 'uuid';
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
  closeButtonLabel: i18n.translate('xpack.upgradeAssistant.overview.flyout.closeButtonLabel', {
    defaultMessage: 'Close',
  }),
  flyoutTitle: i18n.translate('xpack.upgradeAssistant.overview.flyout.title', {
    defaultMessage: 'Upgrade system indices',
  }),
  flyoutDescription: i18n.translate('xpack.upgradeAssistant.overview.flyout.description', {
    defaultMessage:
      'Migrate your system indices to keep them happy. In addition to regular checkups, it is recommended that you brush and floss your indices twice per day.',
  }),
};

const renderMigrationStatus = (status: UPGRADE_STATUS /* , data: SystemIndicesUpgradeStatus*/) => {
  if (status === 'NO_UPGRADE_NEEDED') {
    return (
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiIcon type="checkInCircleFilled" color="success" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText color="green" size="s">
            <p>Upgrade complete</p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
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
            <p>Upgrading...</p>
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
          <p>Error: TODO</p>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const columns = [
  {
    field: 'feature_name',
    name: 'Index name',
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
  const featuresWithId = useMemo(() => {
    return data.features.map((feature) => ({
      ...feature,
      id: uuid.v4(),
    }));
  }, [data]);

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
          items={featuresWithId}
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
