/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiBadge,
  type EuiBadgeProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  useEuiFontSize,
  EuiPopoverFooter,
  EuiText,
  EuiButtonIcon,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { dynamic } from '@kbn/shared-ux-utility';
import { closeCellActionPopoverText, openCellActionPopoverAriaText } from './translations';
import { FilterInButton } from './filter_in_button';
import { FilterOutButton } from './filter_out_button';
import { CopyButton } from './copy_button';

const DataTablePopoverCellValue = dynamic(
  () => import('@kbn/unified-data-table/src/components/data_table_cell_value')
);

interface ChipWithPopoverProps {
  /**
   * ECS mapping for the key
   */
  property: string;
  /**
   * Value for the mapping, which will be displayed
   */
  text: string;
  dataTestSubj?: string;
  leftSideIcon?: React.ReactNode;
  rightSideIcon?: EuiBadgeProps['iconType'];
  borderColor?: string | null;
  style?: React.CSSProperties;
  shouldRenderPopover?: boolean;
}

export function ChipWithPopover({
  property,
  text,
  dataTestSubj = `dataTablePopoverChip_${property}`,
  leftSideIcon,
  rightSideIcon,
  borderColor,
  style,
  shouldRenderPopover = true,
}: ChipWithPopoverProps) {
  const xsFontSize = useEuiFontSize('xs').fontSize;
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const handleChipClick = useCallback(() => {
    if (!shouldRenderPopover) return;
    setIsPopoverOpen(!isPopoverOpen);
  }, [isPopoverOpen, shouldRenderPopover]);

  const closePopover = () => setIsPopoverOpen(false);

  const chipContent = (
    <EuiBadge
      color="hollow"
      iconType={rightSideIcon}
      iconSide="right"
      data-test-subj={dataTestSubj}
      onClick={handleChipClick}
      onClickAriaLabel={openCellActionPopoverAriaText}
      css={css`
        ${borderColor ? `border: 2px solid ${borderColor};` : ''}
        font-size: ${xsFontSize};
        display: flex;
        justify-content: center;
        ${shouldRenderPopover && `margin-right: 4px; margin-top: -3px;`}
        cursor: pointer;
      `}
      style={style}
    >
      <EuiFlexGroup gutterSize="xs">
        {leftSideIcon && <EuiFlexItem>{leftSideIcon}</EuiFlexItem>}
        <EuiFlexItem>{text}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiBadge>
  );

  return (
    <EuiPopover
      button={chipContent}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      anchorPosition="downCenter"
      panelPaddingSize="s"
      panelStyle={{ minWidth: '24px' }}
    >
      <EuiFlexGroup
        gutterSize="none"
        direction="row"
        responsive={false}
        data-test-subj="dataTableCellActionPopoverTitle"
      >
        <EuiFlexItem>
          <div style={{ maxWidth: '200px' }}>
            <EuiText size="s">
              <DataTablePopoverCellValue>
                <span style={{ fontWeight: 700 }}>{property}</span> {text}
              </DataTablePopoverCellValue>
            </EuiText>
          </div>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            aria-label={closeCellActionPopoverText}
            data-test-subj="dataTableExpandCellActionPopoverClose"
            iconSize="s"
            iconType="cross"
            size="xs"
            onClick={closePopover}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiPopoverFooter>
        <EuiFlexGroup responsive={false} gutterSize="none" wrap={true}>
          <FilterInButton value={text} property={property} />
          <FilterOutButton value={text} property={property} />
        </EuiFlexGroup>
      </EuiPopoverFooter>
      <EuiPopoverFooter>
        <EuiFlexGroup direction="column" alignItems="flexStart">
          <CopyButton value={text} property={property} />
        </EuiFlexGroup>
      </EuiPopoverFooter>
    </EuiPopover>
  );
}
