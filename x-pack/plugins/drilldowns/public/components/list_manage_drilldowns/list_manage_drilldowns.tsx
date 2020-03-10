/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButton,
  EuiButtonEmpty,
  EuiSpacer,
} from '@elastic/eui';
import React, { useState } from 'react';
import {
  txtEditDrilldown,
  txtCreateDrilldown,
  txtDeleteDrilldowns,
  txtSelectDrilldown,
} from './i18n';

// TODO: interface is temporary
export interface DrilldownListItem {
  id: string;
  actionTypeDisplayName: string;
  name: string;
}

export interface ListManageDrilldownsProps {
  drilldowns: DrilldownListItem[];

  onEdit?: (id: string) => void;
  onCreate?: () => void;
  onDelete?: (ids: string[]) => void;

  context?: object; // TODO DrilldownBaseContext? ActionBaseContext?
}

const noop = () => {};

export const TEST_SUBJ_DRILLDOWN_ITEM = 'list-manage-drilldowns-item';

export function ListManageDrilldowns({
  drilldowns,
  onEdit = noop,
  onCreate = noop,
  onDelete = noop,
  context = {},
}: ListManageDrilldownsProps) {
  const [selectedDrilldowns, setSelectedDrilldowns] = useState<string[]>([]);

  const columns: Array<EuiBasicTableColumn<DrilldownListItem>> = [
    {
      field: 'name',
      name: 'Name',
      truncateText: true,
    },
    {
      field: 'actionTypeDisplayName',
      name: 'Action',
      truncateText: true,
    },
    {
      render: (drilldown: DrilldownListItem) => (
        <EuiButtonEmpty size="xs" onClick={() => onEdit(drilldown.id)}>
          {txtEditDrilldown}
        </EuiButtonEmpty>
      ),
    },
  ];

  return (
    <>
      <EuiBasicTable
        items={drilldowns}
        itemId="id"
        columns={columns}
        isSelectable={true}
        selection={{
          onSelectionChange: selection => {
            setSelectedDrilldowns(selection.map(drilldown => drilldown.id));
          },
          selectableMessage: () => txtSelectDrilldown,
        }}
        rowProps={{
          'data-test-subj': TEST_SUBJ_DRILLDOWN_ITEM,
        }}
        hasActions={true}
      />
      <EuiSpacer />
      {selectedDrilldowns.length === 0 ? (
        <EuiButton fill onClick={() => onCreate()}>
          {txtCreateDrilldown}
        </EuiButton>
      ) : (
        <EuiButton color="danger" fill onClick={() => onDelete(selectedDrilldowns)}>
          {txtDeleteDrilldowns(selectedDrilldowns.length)}
        </EuiButton>
      )}
    </>
  );
}
