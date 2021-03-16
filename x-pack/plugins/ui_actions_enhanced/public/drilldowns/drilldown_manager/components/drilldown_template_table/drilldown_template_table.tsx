/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiBasicTable, EuiBasicTableColumn, EuiButtonEmpty, EuiSpacer } from '@elastic/eui';
import { txtSelectableMessage } from './i18n';

export interface DrilldownTemplateTableItem {
  id: string;
  name: string;
  description?: string;
}

export interface DrilldownTemplateTableProps {
  items: DrilldownTemplateTableItem[];
  onCreate?: (id: string) => void;
}

export const DrilldownTemplateTable: React.FC<DrilldownTemplateTableProps> = ({
  items,
  onCreate,
}) => {
  const [selected, setSelected] = useState<string[]>([]);

  const columns: Array<EuiBasicTableColumn<DrilldownTemplateTableItem>> = [
    {
      name: 'name...',
      'data-test-subj': 'drilldownListItemName',
      render: (item: DrilldownTemplateTableItem) => item.name,
    },
    {
      align: 'right',
      width: '64px',
      render: (drilldown: DrilldownTemplateTableItem) =>
        !!onCreate && (
          <EuiButtonEmpty
            size="xs"
            disabled={!!selected.length}
            onClick={() => onCreate(drilldown.id)}
          >
            {'create...'}
          </EuiButtonEmpty>
        ),
    },
  ];

  return (
    <>
      <EuiBasicTable
        itemId="id"
        items={items}
        columns={columns}
        isSelectable={true}
        responsive={false}
        selection={{
          onSelectionChange: (selection) => {
            setSelected(selection.map((drilldown) => drilldown.id));
          },
          selectableMessage: () => txtSelectableMessage,
        }}
        hasActions={true}
      />
      <EuiSpacer />
    </>
  );
};
