/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiBasicTable, EuiBasicTableColumn } from '@elastic/eui';
import { ByteSizeValue } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';

import { FlyoutPanel } from './flyout_panel';

interface SyncJobDocumentsPanelProps {
  added: number;
  removed: number;
  total: number;
  volume: number;
}

export const SyncJobDocumentsPanel: React.FC<SyncJobDocumentsPanelProps> = (syncJobDocuments) => {
  const columns: Array<EuiBasicTableColumn<SyncJobDocumentsPanelProps>> = [
    {
      field: 'added',
      name: i18n.translate('xpack.enterpriseSearch.content.index.syncJobs.documents.added', {
        defaultMessage: 'Added',
      }),
    },
    {
      field: 'removed',
      name: i18n.translate('xpack.enterpriseSearch.content.index.syncJobs.documents.removed', {
        defaultMessage: 'Removed',
      }),
    },
    {
      field: 'total',
      name: i18n.translate('xpack.enterpriseSearch.content.index.syncJobs.documents.total', {
        defaultMessage: 'Total',
      }),
    },
    {
      field: 'volume',
      name: i18n.translate('xpack.enterpriseSearch.content.index.syncJobs.documents.volume', {
        defaultMessage: 'Volume',
      }),
      render: (volume: number) => new ByteSizeValue(volume).toString(),
    },
  ];
  return (
    <FlyoutPanel
      title={i18n.translate('xpack.enterpriseSearch.content.index.syncJobs.documents.title', {
        defaultMessage: 'Documents',
      })}
    >
      <EuiBasicTable columns={columns} items={[syncJobDocuments]} />
    </FlyoutPanel>
  );
};
