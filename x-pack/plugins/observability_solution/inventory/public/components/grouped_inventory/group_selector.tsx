/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPopover } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { StyledContextMenu, StyledEuiButtonEmpty } from './styles';

export interface GroupedSelectorProps {
  groupSelected: string;
  onGroupChange: (groupSelection: string) => void;
}

export function GroupSelector({ groupSelected = 'none', onGroupChange }: GroupedSelectorProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const isGroupSelected = (groupKey: string) => {
    return groupSelected === groupKey;
  };
  const panels = [
    {
      id: 'firstPanel',
      title: 'Select grouping',
      items: [
        {
          'data-test-subj': 'panel-none',
          name: 'None',
          icon: isGroupSelected('none') ? 'check' : 'empty',
          onClick: () => onGroupChange('none'),
        },
        {
          'data-test-subj': 'panel-type',
          name: 'Type',
          icon: isGroupSelected('type') ? 'check' : 'empty',
          onClick: () => onGroupChange('type'),
        },
      ],
    },
  ];

  const onButtonClick = useCallback(() => setIsPopoverOpen((currentVal) => !currentVal), []);

  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const button = (
    <StyledEuiButtonEmpty
      data-test-subj="group-selector-dropdown"
      flush="both"
      iconSide="right"
      iconSize="s"
      iconType="arrowDown"
      onClick={onButtonClick}
      title={i18n.translate('xpack.inventory.groupedInventoryPage.styledEuiButtonEmpty.noneLabel', {
        defaultMessage: 'none',
      })}
      size="s"
    >
      {'Group entities by: none'}
    </StyledEuiButtonEmpty>
  );

  return (
    <EuiPopover
      data-test-subj="inventory.groupedInventoryPage.groupsPopover"
      button={button}
      closePopover={closePopover}
      isOpen={isPopoverOpen}
      panelPaddingSize="none"
    >
      <StyledContextMenu
        data-test-subj="entitiesGroupByContextMnue"
        initialPanelId="firstPanel"
        panels={panels}
      />
    </EuiPopover>
  );
}
