/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPopover, EuiContextMenu, EuiButtonEmpty, useEuiTheme } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useInventoryPageViewContext } from '../../context/inventory_page_view_provider';

const GROUP_LABELS: Record<string, string> = {
  none: i18n.translate('xpack.inventory.groupedInventoryPage.noneLabel', {
    defaultMessage: 'None',
  }),
  type: i18n.translate('xpack.inventory.groupedInventoryPage.typeLabel', {
    defaultMessage: 'Type',
  }),
};

export interface GroupedSelectorProps {
  groupSelected: string;
  onGroupChange: (groupSelection: string) => void;
}

export function GroupSelector() {
  const { euiTheme } = useEuiTheme();
  const { grouping, setGrouping } = useInventoryPageViewContext();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const onGroupChange = (selected: string) => {
    setGrouping(grouping === selected ? 'none' : selected);
  };
  const isGroupSelected = (groupKey: string) => {
    return grouping === groupKey;
  };
  const panels = [
    {
      id: 'firstPanel',
      title: 'Select grouping',
      items: [
        {
          'data-test-subj': 'panel-none',
          name: GROUP_LABELS.none,
          icon: isGroupSelected('none') ? 'check' : 'empty',
          onClick: () => onGroupChange('none'),
        },
        {
          'data-test-subj': 'panel-type',
          name: GROUP_LABELS.type,
          icon: isGroupSelected('type') ? 'check' : 'empty',
          onClick: () => onGroupChange('type'),
        },
      ],
    },
  ];

  const onButtonClick = useCallback(() => setIsPopoverOpen((currentVal) => !currentVal), []);

  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const button = (
    <EuiButtonEmpty
      data-test-subj="group-selector-dropdown"
      css={css`
        font-weight: 'normal';

        .euiButtonEmpty__text {
          max-width: 300px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      `}
      flush="both"
      iconSide="right"
      iconSize="s"
      iconType="arrowDown"
      onClick={onButtonClick}
      title={GROUP_LABELS[grouping]}
      size="s"
    >
      <FormattedMessage
        id="xpack.inventory.groupedInventoryPage.groupedByLabel"
        defaultMessage={`Group entities by: {grouping}`}
        values={{ grouping: GROUP_LABELS[grouping] }}
      />
    </EuiButtonEmpty>
  );

  return (
    <EuiPopover
      data-test-subj="inventory.groupedInventoryPage.groupsPopover"
      button={button}
      closePopover={closePopover}
      isOpen={isPopoverOpen}
      panelPaddingSize="none"
    >
      <EuiContextMenu
        css={css`
          width: 250px;
          & .euiContextMenuItem__text {
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .euiContextMenuItem {
            border-bottom: ${euiTheme.border.thin};
          }
          .euiContextMenuItem:last-child {
            border: none;
          }
        `}
        data-test-subj="entitiesGroupByContextMnue"
        initialPanelId="firstPanel"
        panels={panels}
      />
    </EuiPopover>
  );
}
