/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { EuiAccordion, EuiPanel, EuiSpacer, EuiTitle, useEuiTheme } from '@elastic/eui';
import { GroupedEntitiesGrid } from './grouped_entities_grid';
import type { EntityGroup } from '../../../common/entities';
import { InventoryPanelBadge } from './inventory_panel_badge';

const ENTITIES_COUNT_BADGE = i18n.translate(
  'xpack.inventory.inventoryGroupPanel.entitiesBadgeLabel',
  { defaultMessage: 'Entities' }
);

export interface InventoryGroupAccordionProps {
  group: EntityGroup;
  groupBy: string;
  isLoading?: boolean;
}

export function InventoryGroupAccordion({
  group,
  groupBy,
  isLoading,
}: InventoryGroupAccordionProps) {
  const { euiTheme } = useEuiTheme();
  const field = group[groupBy];
  const [open, setOpen] = useState(false);

  const onToggle = useCallback(() => {
    setOpen((opened) => !opened);
  }, []);

  return (
    <>
      <EuiPanel
        hasBorder
        hasShadow={false}
        css={css`
          padding: ${euiTheme.size.xs} ${euiTheme.size.base};
        `}
      >
        <EuiAccordion
          data-test-subj={`inventoryGroup_${groupBy}_${field}`}
          id={`inventory-group-${groupBy}-${field}`}
          buttonContent={
            <EuiTitle size="xs">
              <h4 data-test-subj={`inventoryGroupTitle_${groupBy}_${field}`}>{field}</h4>
            </EuiTitle>
          }
          buttonElement="div"
          extraAction={
            <InventoryPanelBadge
              data-test-subj={`inventoryPanelBadgeEntitiesCount_${groupBy}_${field}`}
              name={ENTITIES_COUNT_BADGE}
              value={group.count}
            />
          }
          buttonProps={{ paddingSize: 'm' }}
          paddingSize="none"
          onToggle={onToggle}
          isLoading={isLoading}
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
          <GroupedEntitiesGrid field={field} />
        </EuiPanel>
      )}
      <EuiSpacer size="s" />
    </>
  );
}
