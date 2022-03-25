/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiTitle,
  EuiTitleSize,
} from '@elastic/eui';
import React, { useCallback } from 'react';
import styled, { css } from 'styled-components';

import { InspectButton } from '../inspect';

import { Subtitle } from '../subtitle';
import * as i18n from '../../containers/query_toggle/translations';

interface HeaderProps {
  border?: boolean;
  height?: number;
}

const Header = styled.header.attrs(() => ({
  className: 'siemHeaderSection',
}))<HeaderProps>`
  ${({ height }) =>
    height &&
    css`
      height: ${height}px;
    `}
  margin-bottom: ${({ height, theme }) => (height ? 0 : theme.eui.euiSizeL)};
  user-select: text;

  ${({ border }) =>
    border &&
    css`
      border-bottom: ${({ theme }) => theme.eui.euiBorderThin};
      padding-bottom: ${({ theme }) => theme.eui.paddingSizes.l};
    `}
`;
Header.displayName = 'Header';

export interface HeaderSectionProps extends HeaderProps {
  children?: React.ReactNode;
  growLeftSplit?: boolean;
  headerFilters?: string | React.ReactNode;
  height?: number;
  hideSubtitle?: boolean;
  id?: string;
  inspectMultiple?: boolean;
  isInspectDisabled?: boolean;
  showInspectButton?: boolean;
  split?: boolean;
  stackHeader?: boolean;
  subtitle?: string | React.ReactNode;
  toggleQuery?: (status: boolean) => void;
  toggleStatus?: boolean;
  title: string | React.ReactNode;
  titleSize?: EuiTitleSize;
  tooltip?: string;
}

const HeaderSectionComponent: React.FC<HeaderSectionProps> = ({
  border,
  children,
  growLeftSplit = true,
  headerFilters,
  height,
  hideSubtitle = false,
  id,
  inspectMultiple = false,
  isInspectDisabled,
  showInspectButton = true,
  split,
  stackHeader,
  subtitle,
  title,
  titleSize = 'm',
  toggleQuery,
  toggleStatus = true,
  tooltip,
}) => {
  const toggle = useCallback(() => {
    if (toggleQuery) {
      toggleQuery(!toggleStatus);
    }
  }, [toggleQuery, toggleStatus]);
  return (
    <Header data-test-subj="header-section" border={border} height={height}>
      <EuiFlexGroup
        alignItems={stackHeader ? undefined : 'center'}
        direction={stackHeader ? 'column' : 'row'}
        gutterSize="s"
      >
        <EuiFlexItem grow={growLeftSplit}>
          <EuiFlexGroup alignItems="center" responsive={false} gutterSize="s">
            <EuiFlexItem>
              <EuiFlexGroup gutterSize={'none'}>
                {toggleQuery && (
                  <EuiFlexItem grow={false}>
                    <EuiButtonIcon
                      data-test-subj="query-toggle-header"
                      aria-label={i18n.QUERY_BUTTON_TITLE(toggleStatus)}
                      color="text"
                      display="empty"
                      iconType={toggleStatus ? 'arrowDown' : 'arrowRight'}
                      onClick={toggle}
                      size="s"
                      title={i18n.QUERY_BUTTON_TITLE(toggleStatus)}
                    />
                  </EuiFlexItem>
                )}
                <EuiFlexItem>
                  <EuiTitle size={titleSize}>
                    <h4 data-test-subj="header-section-title">
                      <span className="eui-textBreakNormal">{title}</span>
                      {tooltip && (
                        <>
                          {' '}
                          <EuiIconTip color="subdued" content={tooltip} size="l" type="iInCircle" />
                        </>
                      )}
                    </h4>
                  </EuiTitle>
                </EuiFlexItem>
              </EuiFlexGroup>

              {!hideSubtitle && toggleStatus && (
                <Subtitle data-test-subj="header-section-subtitle" items={subtitle} />
              )}
            </EuiFlexItem>

            {id && showInspectButton && toggleStatus && (
              <EuiFlexItem grow={false}>
                <InspectButton
                  isDisabled={isInspectDisabled}
                  queryId={id}
                  multiple={inspectMultiple}
                  title={title}
                />
              </EuiFlexItem>
            )}

            {headerFilters && toggleStatus && (
              <EuiFlexItem data-test-subj="header-section-filters" grow={false}>
                {headerFilters}
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>

        {children && toggleStatus && (
          <EuiFlexItem data-test-subj="header-section-supplements" grow={split ? true : false}>
            {children}
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </Header>
  );
};

export const HeaderSection = React.memo(HeaderSectionComponent);
