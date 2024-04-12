/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTable, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface IndicesTableProps {
  indices: string[];
  onRemoveClick: (index: string) => void;
}

export const IndicesTable: React.FC<IndicesTableProps> = ({ indices, onRemoveClick }) => (
  <EuiBasicTable
    items={indices.map((index) => ({ index }))}
    columns={[
      {
        field: 'index',
        name: i18n.translate('xpack.searchPlayground.sources.indices.table.label', {
          defaultMessage: 'Selected indices',
        }),
        truncateText: true,
        render: (index: string) => <EuiLink href="#">{index}</EuiLink>,
      },
      {
        actions: [
          {
            type: 'icon',
            name: i18n.translate('xpack.searchPlayground.sources.indices.table.remove.label', {
              defaultMessage: 'Remove',
            }),
            description: i18n.translate(
              'xpack.searchPlayground.sources.indices.table.remove.description',
              {
                defaultMessage: 'Remove index',
              }
            ),
            icon: 'minusInCircle',
            onClick: (item: { index: string }) => onRemoveClick(item.index),
          },
        ],
      },
    ]}
    hasActions
  />
);
