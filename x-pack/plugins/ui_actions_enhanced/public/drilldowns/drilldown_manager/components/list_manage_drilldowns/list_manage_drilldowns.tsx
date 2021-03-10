/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiTextColor,
  EuiToolTip,
} from '@elastic/eui';
import React, { useState } from 'react';
import {
  txtCreateDrilldown,
  txtDeleteDrilldowns,
  txtEditDrilldown,
  txtSelectDrilldown,
} from './i18n';

export interface DrilldownListItem {
  id: string;
  actionName: string;
  drilldownName: string;
  icon?: string;
  error?: string;
  triggers?: Trigger[];
}

interface Trigger {
  title?: string;
  description?: string;
}

export interface ListManageDrilldownsProps {
  items: DrilldownListItem[];
  onCreate?: () => void;
  onDelete?: (ids: string[]) => void;
  onEdit?: (id: string) => void;
}

export const TEST_SUBJ_DRILLDOWN_ITEM = 'listManageDrilldownsItem';

export function ListManageDrilldowns({
  items: drilldowns,
  onCreate,
  onDelete,
  onEdit,
}: ListManageDrilldownsProps) {
  const [selectedDrilldowns, setSelectedDrilldowns] = useState<string[]>([]);

  const columns: Array<EuiBasicTableColumn<DrilldownListItem>> = [
    {
      name: 'Name',
      'data-test-subj': 'drilldownListItemName',
      render: (drilldown: DrilldownListItem) => (
        <div>
          {drilldown.drilldownName}{' '}
          {drilldown.error && (
            <EuiToolTip id={`drilldownError-${drilldown.id}`} content={drilldown.error}>
              <EuiIcon
                type="alert"
                color="danger"
                title={drilldown.error}
                aria-label={drilldown.error}
                data-test-subj={`drilldownError-${drilldown.id}`}
                style={{ marginLeft: '4px' }} /* a bit of spacing from text */
              />
            </EuiToolTip>
          )}
        </div>
      ),
    },
    {
      name: 'Action',
      render: (drilldown: DrilldownListItem) => (
        <EuiFlexGroup responsive={false} alignItems="center" gutterSize={'s'}>
          {drilldown.icon && (
            <EuiFlexItem grow={false}>
              <EuiIcon type={drilldown.icon} />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false} style={{ flexWrap: 'wrap' }}>
            <EuiTextColor color="subdued">{drilldown.actionName}</EuiTextColor>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
    {
      name: 'Trigger',
      textOnly: true,
      render: (drilldown: DrilldownListItem) =>
        drilldown.triggers?.map((trigger, idx) =>
          trigger.description ? (
            <EuiToolTip content={trigger.description} key={idx}>
              <EuiTextColor color="subdued">{trigger.title ?? 'unknown'}</EuiTextColor>
            </EuiToolTip>
          ) : (
            <EuiTextColor color="subdued" key={idx}>
              {trigger.title ?? 'unknown'}
            </EuiTextColor>
          )
        ),
    },
    {
      align: 'right',
      width: '64px',
      render: (drilldown: DrilldownListItem) =>
        !!onEdit ? (
          <EuiButtonEmpty
            size="xs"
            disabled={!!selectedDrilldowns.length}
            onClick={() => onEdit(drilldown.id)}
          >
            {txtEditDrilldown}
          </EuiButtonEmpty>
        ) : null,
    },
  ].filter(Boolean) as Array<EuiBasicTableColumn<DrilldownListItem>>;

  return (
    <>
      <EuiBasicTable
        items={drilldowns}
        itemId="id"
        columns={columns}
        isSelectable={true}
        responsive={false}
        selection={{
          onSelectionChange: (selection) => {
            setSelectedDrilldowns(selection.map((drilldown) => drilldown.id));
          },
          selectableMessage: () => txtSelectDrilldown,
        }}
        rowProps={{
          'data-test-subj': TEST_SUBJ_DRILLDOWN_ITEM,
        }}
        hasActions={true}
      />
      <EuiSpacer />
      {!!onCreate && !selectedDrilldowns.length && (
        <EuiButton fill onClick={() => onCreate()}>
          {txtCreateDrilldown}
        </EuiButton>
      )}
      {!!onDelete && selectedDrilldowns.length > 0 && (
        <EuiButton
          color="danger"
          fill
          onClick={() => onDelete(selectedDrilldowns)}
          data-test-subj={'listManageDeleteDrilldowns'}
        >
          {txtDeleteDrilldowns(selectedDrilldowns.length)}
        </EuiButton>
      )}
    </>
  );
}
