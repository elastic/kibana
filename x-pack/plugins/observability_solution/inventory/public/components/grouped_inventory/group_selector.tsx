/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPopover, EuiContextMenu, EuiButtonEmpty } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ENTITY_TYPE } from '@kbn/observability-shared-plugin/common';
import { EntityView } from '../../../common/entities';
import { useInventoryState } from '../../hooks/use_inventory_state';

const GROUP_LABELS: Record<EntityView, string> = {
  unified: i18n.translate('xpack.inventory.groupedInventoryPage.noneLabel', {
    defaultMessage: 'None',
  }),
  [ENTITY_TYPE]: i18n.translate('xpack.inventory.groupedInventoryPage.typeLabel', {
    defaultMessage: 'Type',
  }),
};

export interface GroupedSelectorProps {
  groupSelected: string;
  onGroupChange: (groupSelection: string) => void;
}

export function GroupSelector() {
  const { groupBy, setGroupBy } = useInventoryState();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const onGroupChange = (selected: EntityView) => {
    setGroupBy(groupBy === selected ? 'unified' : selected);
  };
  const isGroupSelected = (groupKey: EntityView) => {
    return groupBy === groupKey;
  };
  const panels = [
    {
      id: 'firstPanel',
      title: 'Select grouping',
      items: [
        {
          'data-test-subj': 'panel-unified',
          name: GROUP_LABELS.unified,
          icon: isGroupSelected('unified') ? 'check' : 'empty',
          onClick: () => onGroupChange('unified'),
        },
        {
          'data-test-subj': 'panel-type',
          name: GROUP_LABELS[ENTITY_TYPE],
          icon: isGroupSelected(ENTITY_TYPE) ? 'check' : 'empty',
          onClick: () => onGroupChange(ENTITY_TYPE),
        },
      ],
    },
  ];

  const onButtonClick = useCallback(() => setIsPopoverOpen((currentVal) => !currentVal), []);

  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const button = (
    <EuiButtonEmpty
      data-test-subj="group-selector-dropdown"
      flush="both"
      iconSide="right"
      iconSize="s"
      iconType="arrowDown"
      onClick={onButtonClick}
      title={GROUP_LABELS[groupBy]}
      size="s"
    >
      <FormattedMessage
        id="xpack.inventory.groupedInventoryPage.groupedByLabel"
        defaultMessage={`Group entities by: {grouping}`}
        values={{ grouping: GROUP_LABELS[groupBy] }}
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
        data-test-subj="entitiesGroupByContextMnue"
        initialPanelId="firstPanel"
        panels={panels}
      />
    </EuiPopover>
  );
}
