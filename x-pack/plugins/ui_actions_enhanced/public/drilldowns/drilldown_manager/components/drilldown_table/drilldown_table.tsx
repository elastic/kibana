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
import { TextWithIcon } from '../text_with_icon';
import {
  txtCreateDrilldown,
  txtDeleteDrilldowns,
  txtEditDrilldown,
  txtCloneDrilldown,
  txtSelectDrilldown,
  txtName,
  txtAction,
  txtTrigger,
} from './i18n';

export interface DrilldownTableItem {
  id: string;
  actionName: string;
  drilldownName: string;
  icon?: string;
  error?: string;
  triggers?: Trigger[];
  triggerIncompatible?: boolean;
}

interface Trigger {
  title?: string;
  description?: string;
}

export const TEST_SUBJ_DRILLDOWN_ITEM = 'listManageDrilldownsItem';

export interface DrilldownTableProps {
  items: DrilldownTableItem[];
  onCreate?: () => void;
  onDelete?: (ids: string[]) => void;
  onEdit?: (id: string) => void;
  onCopy?: (id: string) => void;
}

export const DrilldownTable: React.FC<DrilldownTableProps> = ({
  items: drilldowns,
  onCreate,
  onDelete,
  onEdit,
  onCopy,
}) => {
  const [selectedDrilldowns, setSelectedDrilldowns] = useState<string[]>([]);

  const columns: Array<EuiBasicTableColumn<DrilldownTableItem>> = [
    {
      name: txtName,
      'data-test-subj': 'drilldownListItemName',
      render: (drilldown: DrilldownTableItem) => (
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
      name: txtAction,
      render: (drilldown: DrilldownTableItem) => (
        <TextWithIcon icon={drilldown.icon} color={'subdued'}>
          {drilldown.actionName}
        </TextWithIcon>
      ),
    },
    {
      name: txtTrigger,
      textOnly: true,
      render: (drilldown: DrilldownTableItem) => {
        if (!drilldown.triggers) return null;
        const trigger = drilldown.triggers[0];
        let result = trigger.description ? (
          <EuiToolTip content={trigger.description}>
            <EuiTextColor color="subdued">{trigger.title ?? 'unknown'}</EuiTextColor>
          </EuiToolTip>
        ) : (
          <EuiTextColor color="subdued">{trigger.title ?? 'unknown'}</EuiTextColor>
        );
        if (drilldown.triggerIncompatible) {
          result = (
            <TextWithIcon icon={'alert'} iconColor={'danger'} color={'subdued'}>
              {result}
            </TextWithIcon>
          );
        }
        return result;
      },
    },
    {
      align: 'right',
      render: (drilldown: DrilldownTableItem) => (
        <>
          {!!onEdit && (
            <EuiButtonEmpty
              size="xs"
              disabled={!!selectedDrilldowns.length}
              onClick={() => onEdit(drilldown.id)}
            >
              {txtEditDrilldown}
            </EuiButtonEmpty>
          )}
          {!!onCopy && (
            <EuiButtonEmpty
              size="xs"
              disabled={!!selectedDrilldowns.length}
              onClick={() => onCopy(drilldown.id)}
            >
              {txtCloneDrilldown}
            </EuiButtonEmpty>
          )}
        </>
      ),
    },
  ].filter(Boolean) as Array<EuiBasicTableColumn<DrilldownTableItem>>;

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
};
