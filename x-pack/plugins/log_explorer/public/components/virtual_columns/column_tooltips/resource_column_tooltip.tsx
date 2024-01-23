/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText, EuiToken, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { CustomGridColumnProps } from '@kbn/unified-data-table';
import { css } from '@emotion/react';
import { resourceHeaderTooltipParagraph, resourceLabel } from '../../common/translations';
import { HoverPopover } from '../../common/hover_popover';
import { TooltipButtonComponent } from './tooltip_button';

export const ResourceColumnTooltip = ({ column, headerRowHeight }: CustomGridColumnProps) => {
  const { euiTheme } = useEuiTheme();
  const spacingCSS = css`
    margin-bottom: ${euiTheme.size.s};
  `;

  const spacingXsCss = css`
    margin-bottom: ${euiTheme.size.xs};
  `;

  return (
    <HoverPopover
      button={
        <TooltipButtonComponent
          displayText={column.displayAsText}
          headerRowHeight={headerRowHeight}
        />
      }
      title={resourceLabel}
    >
      <div style={{ width: '230px' }}>
        <EuiText size="s" css={spacingCSS}>
          <p>{resourceHeaderTooltipParagraph}</p>
        </EuiText>
        <div css={spacingXsCss}>
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
                <strong>service.name</strong>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
        <div css={spacingXsCss}>
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
                <strong>container.name</strong>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
        <div css={spacingXsCss}>
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
                <strong>orchestrator.namespace</strong>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
        <div css={spacingXsCss}>
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
                <strong>host.name</strong>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
        <div css={spacingXsCss}>
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
                <strong>cloud.instance.id</strong>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </div>
    </HoverPopover>
  );
};
