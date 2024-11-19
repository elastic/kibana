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
import type { EntityView } from '../../../common/entities';
import { useInventoryParams } from '../../hooks/use_inventory_params';
import { useInventoryRouter } from '../../hooks/use_inventory_router';

const GROUP_LABELS: Record<EntityView, string> = {
  unified: i18n.translate('xpack.inventory.groupedInventoryPage.noneLabel', {
    defaultMessage: 'None',
  }),
  grouped: i18n.translate('xpack.inventory.groupedInventoryPage.typeLabel', {
    defaultMessage: 'Type',
  }),
};

export interface GroupedSelectorProps {
  groupSelected: string;
  onGroupChange: (groupSelection: string) => void;
}

export function GroupSelector() {
  const { query } = useInventoryParams('/');
  const inventoryRoute = useInventoryRouter();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const groupBy = query.view ?? 'grouped';

  const onGroupChange = (selected: EntityView) => {
    const { pagination: _, ...rest } = query;

    inventoryRoute.push('/', {
      path: {},
      query: {
        ...rest,
        view: groupBy === selected ? 'unified' : selected,
      },
    });
  };

  const isGroupSelected = (groupKey: EntityView) => {
    return groupBy === groupKey;
  };

  const panels = [
    {
      id: 'firstPanel',
      title: i18n.translate('xpack.inventory.groupedInventoryPage.groupSelectorLabel', {
        defaultMessage: 'Select grouping',
      }),
      items: [
        {
          'data-test-subj': 'panelUnified',
          name: GROUP_LABELS.unified,
          icon: isGroupSelected('unified') ? 'check' : 'empty',
          onClick: () => onGroupChange('unified'),
        },
        {
          'data-test-subj': 'panelType',
          name: GROUP_LABELS.grouped,
          icon: isGroupSelected('grouped') ? 'check' : 'empty',
          onClick: () => onGroupChange('grouped'),
        },
      ],
    },
  ];

  const onButtonClick = useCallback(() => setIsPopoverOpen((currentVal) => !currentVal), []);

  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const button = (
    <EuiButtonEmpty
      data-test-subj="groupSelectorDropdown"
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
      data-test-subj="inventoryGroupsPopover"
      button={button}
      closePopover={closePopover}
      isOpen={isPopoverOpen}
      panelPaddingSize="none"
    >
      <EuiContextMenu
        data-test-subj="entitiesGroupByContextMenu"
        initialPanelId="firstPanel"
        panels={panels}
      />
    </EuiPopover>
  );
}
