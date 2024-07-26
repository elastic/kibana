/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiErrorBoundary,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiText,
} from '@elastic/eui';
// @ts-expect-error
import { getTextColor } from '@elastic/eui/lib/components/badge/color_utils';
import { css } from '@emotion/css';
import { WorkflowBlock } from '@kbn/investigate-plugin/common';
import classNames from 'classnames';
import { rgba } from 'polished';
import React from 'react';
import { useTheme } from '../../hooks/use_theme';

const groupClassName = css`
  height: 100%;
`;

const textItemClassName = css`
  max-width: 100%;
  text-align: left;
`;

const descriptionClassName = css`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const itemClassName = css`
  max-width: 320px;
`;

const loadingContainerClassName = css`
  height: 100%;
`;

function WorkflowBlockControl({
  content,
  description,
  loading,
  onClick,
  color = 'primary',
  children,
  compressed,
}: Omit<WorkflowBlock, 'id'> & { compressed: boolean }) {
  const theme = useTheme();

  const actualColor = theme.colors[loading ? 'lightestShade' : color];

  const panelClassName = css`
    background-color: ${rgba(actualColor, 0.75)};
    height: ${compressed ? 32 : 128}px;
    transition: all ${theme.animation.fast} ${theme.animation.resistance} !important;
  `;

  const contentClassName = css`
    overflow: hidden;
    text-overflow: ellipsis;
    font-weight: 500;
    white-space: normal;
    display: -webkit-box;
    -webkit-line-clamp: ${compressed ? 1 : 2};
    -webkit-box-orient: vertical;
  `;

  const panelClickableClassName = onClick
    ? classNames(
        panelClassName,
        css`
          cursor: pointer;
          &:hover,
          &:focus {
            box-shadow: none;
            background-color: ${rgba(actualColor, 1)};
            transform: none;
            border: 1px solid ${theme.colors.darkestShade};
          }
        `
      )
    : panelClassName;

  const textColor = getTextColor({ euiTheme: theme }, actualColor);

  if (loading) {
    return (
      <>
        <EuiPanel hasBorder hasShadow={false} className={panelClassName}>
          <EuiFlexGroup
            alignItems="center"
            justifyContent="center"
            className={loadingContainerClassName}
          >
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
        {children}
      </>
    );
  }

  return (
    <>
      <EuiPanel hasBorder hasShadow={false} className={panelClickableClassName} onClick={onClick}>
        <EuiFlexGroup
          direction="column"
          gutterSize="xs"
          alignItems="flexStart"
          justifyContent="center"
          className={groupClassName}
        >
          {description && !compressed && (
            <EuiFlexItem grow={false} className={textItemClassName}>
              <EuiText size="xs" color={textColor} className={descriptionClassName}>
                {description}
              </EuiText>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false} className={textItemClassName}>
            <EuiText size={compressed ? 's' : 'm'} color={textColor} className={contentClassName}>
              {content}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      {children}
    </>
  );
}

export function WorkflowBlocksControl({
  blocks,
  compressed,
}: {
  blocks: WorkflowBlock[];
  compressed: boolean;
}) {
  return (
    <EuiFlexGroup direction="row" gutterSize="s" alignItems="flexStart">
      {blocks.map((block) => (
        <EuiFlexItem key={block.id} className={itemClassName}>
          <EuiErrorBoundary>
            <WorkflowBlockControl {...block} compressed={compressed} />
          </EuiErrorBoundary>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}
