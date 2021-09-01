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
  EuiTitle,
  EuiText,
  EuiInMemoryTable,
} from '@elastic/eui';

export interface SystemIndicesFlyoutProps {
  closeFlyout: () => void;
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
    truncateText: true,
  },
];

const dataMock = [
  {
    id: '1',
    feature_name: 'security',
    minimum_index_version: '7.1.1',
    upgrade_status: 'UPGRADE_NEEDED',
    indices: [
      {
        index: '.security-7',
        index_version: '7.1.1',
      },
    ],
  },
];

export const SystemIndicesFlyout = ({ closeFlyout }: SystemIndicesFlyoutProps) => {
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
        <EuiInMemoryTable items={dataMock} columns={columns} pagination={true} sorting={true} />
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
