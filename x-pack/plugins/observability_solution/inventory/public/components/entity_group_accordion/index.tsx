/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiAccordion, EuiPanel, EuiSpacer, EuiTitle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useState } from 'react';
import { EntityCountBadge } from './entity_count_badge';
import { GroupedEntitiesGrid } from './grouped_entities_grid';

const ENTITIES_COUNT_BADGE = i18n.translate(
  'xpack.inventory.inventoryGroupPanel.entitiesBadgeLabel',
  { defaultMessage: 'Entities' }
);

export interface Props {
  groupBy: string;
  groupValue: string;
  groupCount: number;
  isLoading?: boolean;
}

export function EntityGroupAccordion({ groupBy, groupValue, groupCount, isLoading }: Props) {
  const { euiTheme } = useEuiTheme();
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
          data-test-subj={`inventoryGroup_${groupBy}_${groupValue}`}
          id={`inventory-group-${groupBy}-${groupValue}`}
          buttonContent={
            <EuiTitle size="xs">
              <h4 data-test-subj={`inventoryGroupTitle_${groupBy}_${groupValue}`}>{groupValue}</h4>
            </EuiTitle>
          }
          buttonElement="div"
          extraAction={
            <EntityCountBadge
              data-test-subj={`entityCountBadge_${groupBy}_${groupValue}`}
              name={ENTITIES_COUNT_BADGE}
              value={groupCount}
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
          <GroupedEntitiesGrid groupValue={groupValue} />
        </EuiPanel>
      )}
      <EuiSpacer size="s" />
    </>
  );
}
