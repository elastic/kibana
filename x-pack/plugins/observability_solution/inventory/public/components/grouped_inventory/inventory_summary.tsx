/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { GroupSelector } from './group_selector';

export function InventorySummary({
  totalEntities,
  totalGroups,
}: {
  totalEntities: number;
  totalGroups?: number;
}) {
  const { euiTheme } = useEuiTheme();
  const groupCountCss = css`
    font-weight: ${euiTheme.font.weight.semiBold};
    border-right: ${euiTheme.border.thin};
    margin-right: ${euiTheme.size.base};
    padding-right: ${euiTheme.size.base};
  `;

  const isGrouped = totalGroups !== undefined;

  return (
    <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="none">
          <EuiFlexItem grow={false}>
            <span css={groupCountCss} style={{ borderRight: !isGrouped ? 'none' : undefined }}>
              <FormattedMessage
                id="xpack.inventory.groupedInventoryPage.entitiesTotalLabel"
                defaultMessage="{total} Entities"
                values={{ total: totalEntities }}
              />
            </span>
          </EuiFlexItem>
          {isGrouped ? (
            <EuiFlexItem grow={false}>
              <span css={groupCountCss} style={{ borderRight: 'none' }}>
                <FormattedMessage
                  id="xpack.inventory.groupedInventoryPage.groupsTotalLabel"
                  defaultMessage="{total} Groups"
                  values={{ total: totalGroups }}
                />
              </span>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <GroupSelector />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
