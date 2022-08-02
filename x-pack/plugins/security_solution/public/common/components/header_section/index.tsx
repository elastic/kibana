/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiTitleSize } from '@elastic/eui';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiTitle } from '@elastic/eui';
import React, { useCallback } from 'react';
import styled, { css } from 'styled-components';

import classnames from 'classnames';
import { InspectButton } from '../inspect';

import { Subtitle } from '../subtitle';
import * as i18n from '../../containers/query_toggle/translations';

interface HeaderProps {
  border?: boolean;
  height?: number;
  className?: string;
  $hideSubtitle?: boolean;
}

const Header = styled.header<HeaderProps>`
  &.toggle-expand {
    margin-bottom: ${({ theme }) => theme.eui.euiSizeL};
  }

  .no-margin {
    margin-top: 0 !important;
    margin-bottom: 0 !important;
  }

  ${({ height }) =>
    height &&
    css`
      height: ${height}px;
    `}
  margin-bottom: 0;
  user-select: text;

  ${({ border }) =>
    border &&
    css`
      border-bottom: ${({ theme }) => theme.eui.euiBorderThin};
      padding-bottom: ${({ theme }) => theme.eui.euiSizeL};
    `}
`;
Header.displayName = 'Header';

export interface HeaderSectionProps extends HeaderProps {
  alignHeader?: 'center' | 'baseline' | 'stretch' | 'flexStart' | 'flexEnd';
  children?: React.ReactNode;
  outerDirection?: 'row' | 'rowReverse' | 'column' | 'columnReverse' | undefined;
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
  inspectTitle?: string;
  titleSize?: EuiTitleSize;
  tooltip?: string;
}

export const getHeaderAlignment = ({
  alignHeader,
  stackHeader,
}: {
  alignHeader?: 'center' | 'baseline' | 'stretch' | 'flexStart' | 'flexEnd';
  stackHeader?: boolean;
}) => {
  if (alignHeader != null) {
    return alignHeader;
  } else if (stackHeader) {
    return undefined;
  } else {
    return 'center';
  }
};

const HeaderSectionComponent: React.FC<HeaderSectionProps> = ({
  alignHeader,
  border,
  children,
  outerDirection = 'column',
  growLeftSplit = true,
  headerFilters,
  height,
  hideSubtitle = false,
  id,
  inspectMultiple = false,
  inspectTitle,
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

  const classNames = classnames({
    'toggle-expand': toggleStatus,
    siemHeaderSection: true,
  });
  return (
    <Header
      data-test-subj="header-section"
      border={border}
      height={height}
      className={classNames}
      $hideSubtitle={hideSubtitle}
    >
      <EuiFlexGroup
        data-test-subj="headerSectionOuterFlexGroup"
        direction={outerDirection}
        gutterSize="xs"
        responsive={false}
      >
        <EuiFlexItem grow={growLeftSplit}>
          <EuiFlexGroup
            alignItems={getHeaderAlignment({ alignHeader, stackHeader })}
            data-test-subj="headerSectionInnerFlexGroup"
            direction={stackHeader ? 'column' : 'row'}
            gutterSize="s"
          >
            <EuiFlexItem grow={growLeftSplit} className={toggleStatus ? '' : 'no-margin'}>
              <EuiFlexGroup alignItems="center" responsive={false} gutterSize="s">
                <EuiFlexItem>
                  <EuiFlexGroup
                    responsive={false}
                    gutterSize={'none'}
                    className="header-section-titles"
                  >
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
                              <EuiIconTip
                                color="subdued"
                                content={tooltip}
                                size="l"
                                type="iInCircle"
                              />
                            </>
                          )}
                        </h4>
                      </EuiTitle>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>

                {id && toggleStatus && (
                  <EuiFlexItem grow={false}>
                    <InspectButton
                      isDisabled={isInspectDisabled}
                      queryId={id}
                      multiple={inspectMultiple}
                      showInspectButton={showInspectButton}
                      title={inspectTitle != null ? inspectTitle : title}
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
        </EuiFlexItem>
        {!hideSubtitle && toggleStatus && (
          <EuiFlexItem>
            <Subtitle data-test-subj="header-section-subtitle" items={subtitle} />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </Header>
  );
};

export const HeaderSection = React.memo(HeaderSectionComponent);
