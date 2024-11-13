/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  copyToClipboard,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { ENTITY_TYPE } from '@kbn/observability-shared-plugin/common';
import React, { useState } from 'react';
import { useUnifiedSearchContext } from '../../hooks/use_unified_search_context';

interface Props {
  field: string;
  value: string;
}

export function BadgeFilterWithPopover({ field, value }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const theme = useEuiTheme();
  const { addFilter } = useUnifiedSearchContext();

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
          {value}
        </EuiBadge>
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="s"
    >
      <EuiPopoverTitle>
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
      </EuiPopoverTitle>
      <EuiFlexGroup responsive={false}>
        <EuiFlexItem>
          <EuiButtonEmpty
            data-test-subj="inventoryBadgeFilterWithPopoverFilterForButton"
            iconType="plusInCircle"
            onClick={() => {
              addFilter({ fieldName: ENTITY_TYPE, operation: '+', value });
            }}
          >
            {i18n.translate('xpack.inventory.badgeFilterWithPopover.filterForButtonEmptyLabel', {
              defaultMessage: 'Filter for',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiButtonEmpty
            data-test-subj="inventoryBadgeFilterWithPopoverFilterForButton"
            iconType="minusInCircle"
            onClick={() => {
              addFilter({ fieldName: ENTITY_TYPE, operation: '-', value });
            }}
          >
            {i18n.translate('xpack.inventory.badgeFilterWithPopover.filterForButtonEmptyLabel', {
              defaultMessage: 'Filter out',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiPopoverFooter>
        <EuiButtonEmpty
          data-test-subj="inventoryBadgeFilterWithPopoverCopyValueButton"
          iconType="copyClipboard"
          onClick={() => copyToClipboard(value)}
        >
          {i18n.translate('xpack.inventory.badgeFilterWithPopover.copyValueButtonEmptyLabel', {
            defaultMessage: 'Copy value',
          })}
        </EuiButtonEmpty>
      </EuiPopoverFooter>
    </EuiPopover>
  );
}
