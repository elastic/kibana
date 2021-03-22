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
  EuiText,
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
  txtSourceColumnTitle,
  txtActionColumnTitle,
  txtTriggerColumnTitle,
} from './i18n';

export interface DrilldownTemplateTableItem {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  actionName?: string;
  actionIcon?: string;
  trigger?: string;
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
      render: (item: DrilldownTemplateTableItem) => (
        <div style={{ display: 'block' }}>
          <div style={{ display: 'block' }}>{item.name}</div>
          <EuiText size={'xs'} color={'subdued'}>
            {item.description}
          </EuiText>
        </div>
      ),
    },
    // {
    //   name: txtSourceColumnTitle,
    //   render: (item: DrilldownTemplateTableItem) => (
    //     <EuiTextColor color={'subdued'}>{item.description}</EuiTextColor>
    //   ),
    // },
    {
      name: txtActionColumnTitle,
      render: (item: DrilldownTemplateTableItem) => (
        <EuiFlexGroup responsive={false} alignItems="center" gutterSize={'s'}>
          <EuiFlexItem grow={false}>
            <EuiIcon type={item.actionIcon || 'empty'} />
          </EuiFlexItem>
          {!!item.actionName && (
            <EuiFlexItem grow={false} style={{ flexWrap: 'wrap' }}>
              <EuiTextColor color={'subdued'}>{item.actionName}</EuiTextColor>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      ),
    },
    {
      name: txtTriggerColumnTitle,
      render: (item: DrilldownTemplateTableItem) => (
        <EuiTextColor color={'subdued'}>{item.trigger}</EuiTextColor>
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
        sorting={{
          sort: {
            direction: 'asc',
            field: 'name',
          },
          enableAllColumns: true,
        }}
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
