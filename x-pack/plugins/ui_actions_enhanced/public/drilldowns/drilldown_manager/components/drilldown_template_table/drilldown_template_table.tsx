/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButtonEmpty,
  EuiSpacer,
  EuiButton,
  EuiTextColor,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
} from '@elastic/eui';
import {
  txtNameColumnTitle,
  txtSelectableMessage,
  txtCloneButtonLabel,
  txtSingleItemCloneActionLabel,
} from './i18n';

export interface DrilldownTemplateTableItem {
  id: string;
  name: string;
  icon?: string;
  description?: string;
}

export interface DrilldownTemplateTableProps {
  items: DrilldownTemplateTableItem[];
  onCreate?: (id: string) => void;
  onClone?: (ids: string[]) => void;
}

export const DrilldownTemplateTable: React.FC<DrilldownTemplateTableProps> = ({
  items,
  onCreate,
  onClone,
}) => {
  const [selected, setSelected] = useState<string[]>([]);

  const columns: Array<EuiBasicTableColumn<DrilldownTemplateTableItem>> = [
    {
      name: txtNameColumnTitle,
      render: (item: DrilldownTemplateTableItem) => item.name,
    },
    {
      name: 'Source...',
      render: (item: DrilldownTemplateTableItem) => (
        <EuiFlexGroup responsive={false} alignItems="center" gutterSize={'s'}>
          <EuiFlexItem grow={false}>
            <EuiIcon type={item.icon || 'empty'} />
          </EuiFlexItem>
          <EuiFlexItem grow={false} style={{ flexWrap: 'wrap' }}>
            <EuiTextColor color={'subdued'}>{item.description}</EuiTextColor>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
    {
      align: 'right',
      render: (drilldown: DrilldownTemplateTableItem) =>
        !!onCreate && (
          <EuiButtonEmpty
            size="xs"
            disabled={!!selected.length}
            onClick={() => onCreate(drilldown.id)}
          >
            {txtSingleItemCloneActionLabel}
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
        isSelectable={!!onClone}
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
      {!!onClone && !!selected.length && (
        <EuiButton fill onClick={() => onClone(selected)}>
          {txtCloneButtonLabel(selected.length)}
        </EuiButton>
      )}
    </>
  );
};
