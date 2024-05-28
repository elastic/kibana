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
  EuiThemeComputed,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { InvestigateWidgetCreate } from '@kbn/investigate-plugin/common';
import classNames from 'classnames';
import { castArray } from 'lodash';
import { Moment } from 'moment';
import { rgba } from 'polished';
import React from 'react';
import { PickByValue } from 'utility-types';
import { useTheme } from '../../hooks/use_theme';
import { AlertsQuickLink } from './alerts_quick_link';
import { ApmQuickLink } from './apm_quick_link';
import { SloQuickLink } from './slo_quick_link';

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

const contentClassName = css`
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const itemClassName = css`
  max-width: 320px;
`;

const loadingContainerClassName = css`
  height: 100%;
`;

export function AddWidgetQuickLink({
  content,
  description,
  loading,
  onClick,
  color = 'lightestShade',
  children,
}: {
  content?: string;
  description?: string;
  loading: boolean;
  onClick?: () => void;
  color?: keyof PickByValue<EuiThemeComputed<{}>['colors'], string>;
  children?: React.ReactNode;
}) {
  const theme = useTheme();

  const panelClassName = css`
    background-color: ${rgba(theme.colors[color], 0.75)};
    height: 120px;
    transition: all ${theme.animation.fast} ${theme.animation.resistance} !important;
  `;

  const panelClickableClassName = onClick
    ? classNames(
        panelClassName,
        css`
          cursor: pointer;
          &:hover,
          &:focus {
            box-shadow: none;
            background-color: ${rgba(theme.colors[color], 1)};
            transform: none;
            border: 1px solid ${theme.colors.darkestShade};
          }
        `
      )
    : panelClassName;

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
          {description && (
            <EuiFlexItem grow={false} className={textItemClassName}>
              <EuiText size="xs" color={theme.colors.text} className={descriptionClassName}>
                {description}
              </EuiText>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false} className={textItemClassName}>
            <EuiText size="m" color={theme.colors.text} className={contentClassName}>
              {content}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      {children}
    </>
  );
}

export function AddWidgetQuickLinkList({
  children,
}: {
  children: React.ReactElement | React.ReactElement[];
}) {
  return (
    <EuiFlexGroup direction="row" gutterSize="s" alignItems="flexStart">
      {castArray(children).map((child, index) => (
        <EuiFlexItem key={child.key || index} className={itemClassName}>
          {child}
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}
export function AddWidgetQuickLinks({
  onWidgetAdd,
  start,
  end,
}: {
  onWidgetAdd: (create: InvestigateWidgetCreate) => Promise<void>;
  start: Moment;
  end: Moment;
}) {
  return (
    <AddWidgetQuickLinkList>
      <EuiErrorBoundary>
        <SloQuickLink onWidgetAdd={onWidgetAdd} />
      </EuiErrorBoundary>
      <EuiErrorBoundary>
        <AlertsQuickLink onWidgetAdd={onWidgetAdd} />
      </EuiErrorBoundary>
      <EuiErrorBoundary>
        <ApmQuickLink
          onWidgetAdd={onWidgetAdd}
          start={start.toISOString()}
          end={end.toISOString()}
        />
      </EuiErrorBoundary>
    </AddWidgetQuickLinkList>
  );
}
