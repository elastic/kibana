/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, EuiToken, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { CustomGridColumnProps } from '@kbn/unified-data-table';
import { css } from '@emotion/react';
import {
  contentHeaderTooltipParagraph1,
  contentHeaderTooltipParagraph2,
  contentLabel,
} from '../../common/translations';
import { dynamic } from '../../../utils/dynamic';
import { HoverPopover } from '../../common/hover_popover';

const ColumnHeaderTruncateContainer = dynamic(
  () => import('@kbn/unified-data-table/src/components/column_header_truncate_container')
);

export const ContentColumnTooltip = ({ column, headerRowHeight }: CustomGridColumnProps) => {
  const { euiTheme } = useEuiTheme();
  const spacingCSS = css`
    margin-bottom: ${euiTheme.size.s};
  `;

  const contentButtonComponent = (
    <ColumnHeaderTruncateContainer headerRowHeight={headerRowHeight}>
      {column.displayAsText} <EuiIcon type="questionInCircle" />
    </ColumnHeaderTruncateContainer>
  );
  return (
    <HoverPopover button={contentButtonComponent} title={contentLabel}>
      <div style={{ width: '230px' }}>
        <EuiText size="s" css={spacingCSS}>
          <p>{contentHeaderTooltipParagraph1}</p>
        </EuiText>
        <EuiText size="s" css={spacingCSS}>
          <p>{contentHeaderTooltipParagraph2}</p>
        </EuiText>
        <EuiFlexGroup
          responsive={false}
          alignItems="center"
          justifyContent="flexStart"
          gutterSize="xs"
        >
          <EuiFlexItem grow={false}>
            <EuiToken iconType="tokenKeyword" size="s" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <strong>error.message</strong>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexGroup
          responsive={false}
          alignItems="center"
          justifyContent="flexStart"
          gutterSize="xs"
        >
          <EuiFlexItem grow={false}>
            <EuiToken iconType="tokenEvent" size="s" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <strong>event.original</strong>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </HoverPopover>
  );
};
