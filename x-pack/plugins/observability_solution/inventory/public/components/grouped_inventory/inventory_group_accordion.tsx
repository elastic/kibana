/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { EuiAccordion, EuiPanel, EuiSpacer, useEuiTheme } from '@elastic/eui';
import { InventoryGroupPanel } from './inventory_group_panel';
import { GroupedGridWrapper } from './grouped_grid_wrapper';
import { EntityGroup } from '../../../common/entities';
import { InventoryPanelBadge } from './inventory_panel_badge';

const ENTITIES_COUNT_BADGE = i18n.translate(
  'xpack.inventory.inventoryGroupPanel.entitiesBadgeLabel',
  { defaultMessage: 'Entities' }
);

export interface InventoryGroupAccordionProps {
  group: EntityGroup;
  groupBy: string;
}

export function InventoryGroupAccordion({ group, groupBy }: InventoryGroupAccordionProps) {
  const { euiTheme } = useEuiTheme();
  const field = group[groupBy];
  const id = `inventory-group-${groupBy}-${field}`;
  const [open, setOpen] = useState(false);

  const onToggle = useCallback(() => {
    setOpen((opened) => !opened);
  }, []);

  return (
    <>
      <EuiPanel hasBorder hasShadow={false} paddingSize="xs">
        <EuiAccordion
          className="inventoryGroupAccordion"
          data-test-subj={id}
          id={id}
          buttonContent={<InventoryGroupPanel field={field} />}
          buttonElement="div"
          extraAction={
            <InventoryPanelBadge
              data-test-subj="inventory-panel-badge-entities-count"
              name={ENTITIES_COUNT_BADGE}
              value={group.count}
            />
          }
          buttonProps={{ paddingSize: 'm' }}
          paddingSize="none"
          onToggle={onToggle}
        />
      </EuiPanel>
      {open && (
        <EuiPanel
          css={css`
            margin: 0 ${euiTheme.size.s};
            border-top: none;
            border-radius: 0 0 ${euiTheme.border.radius.medium} ${euiTheme.border.radius.medium};
          `}
          hasBorder
          hasShadow={false}
          paddingSize="m"
        >
          <GroupedGridWrapper field={field} />
        </EuiPanel>
      )}
      <EuiSpacer size="s" />
    </>
  );
}
