/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverFooter,
  copyToClipboard,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';

interface Props {
  field: string;
  value: string;
  label?: string;
  onFilter: () => void;
}

export function BadgeFilterWithPopover({ field, value, onFilter, label }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const theme = useEuiTheme();

  return (
    <EuiPopover
      button={
        <EuiBadge
          data-test-subj="inventoryBadgeFilterWithPopoverButton"
          color="hollow"
          onClick={() => setIsOpen((state) => !state)}
          onClickAriaLabel={i18n.translate(
            'xpack.inventory.badgeFilterWithPopover.openPopoverBadgeLabel',
            { defaultMessage: 'Open popover' }
          )}
        >
          {label || value}
        </EuiBadge>
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
    >
      <span data-test-subj="inventoryBadgeFilterWithPopoverTitle">
        <EuiFlexGroup
          data-test-subj="inventoryBadgeFilterWithPopoverContent"
          responsive={false}
          gutterSize="xs"
          css={css`
            font-family: ${theme.euiTheme.font.familyCode};
          `}
        >
          <EuiFlexItem grow={false}>
            <span
              css={css`
                font-weight: bold;
              `}
            >
              {field}:
            </span>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <span className="eui-textBreakWord">{value}</span>
          </EuiFlexItem>
        </EuiFlexGroup>
      </span>
      <EuiPopoverFooter>
        <EuiFlexGrid responsive={false} columns={2}>
          <EuiFlexItem>
            <EuiButtonEmpty
              data-test-subj="inventoryBadgeFilterWithPopoverFilterForButton"
              iconType="plusInCircle"
              onClick={onFilter}
            >
              {i18n.translate('xpack.inventory.badgeFilterWithPopover.filterForButtonEmptyLabel', {
                defaultMessage: 'Filter for',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiButtonEmpty
              data-test-subj="inventoryBadgeFilterWithPopoverCopyValueButton"
              iconType="copyClipboard"
              onClick={() => copyToClipboard(value)}
            >
              {i18n.translate('xpack.inventory.badgeFilterWithPopover.copyValueButtonEmptyLabel', {
                defaultMessage: 'Copy value',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGrid>
      </EuiPopoverFooter>
    </EuiPopover>
  );
}
