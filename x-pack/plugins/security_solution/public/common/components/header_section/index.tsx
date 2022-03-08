/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiTitle, EuiTitleSize } from '@elastic/eui';
import React from 'react';
import styled, { css } from 'styled-components';

import { InspectButton } from '../inspect';
import { VisualizationActions } from '../visualization_actions';
import { LensAttributes, GetLensAttributes } from '../visualization_actions/types';
import { Subtitle } from '../subtitle';
import { APP_ID } from '../../../../common/constants';
import { useGetUserCasesPermissions, useKibana } from '../../lib/kibana';

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
  getLensAttributes?: GetLensAttributes;
  growLeftSplit?: boolean;
  headerFilters?: string | React.ReactNode;
  height?: number;
  hideSubtitle?: boolean;
  id?: string;
  inspectMultiple?: boolean;
  isInspectDisabled?: boolean;
  lensAttributes?: LensAttributes | null;
  showInspectButton?: boolean;
  split?: boolean;
  stackByField?: string;
  stackHeader?: boolean;
  subtitle?: string | React.ReactNode;
  timerange?: { from: string; to: string };
  title: string | React.ReactNode;
  titleSize?: EuiTitleSize;
  tooltip?: string;
}

const HeaderSectionComponent: React.FC<HeaderSectionProps> = ({
  border,
  children,
  getLensAttributes,
  growLeftSplit = true,
  headerFilters,
  height,
  hideSubtitle = false,
  id,
  inspectMultiple = false,
  isInspectDisabled,
  lensAttributes,
  showInspectButton = true,
  split,
  stackByField,
  stackHeader,
  subtitle,
  timerange,
  title,
  titleSize = 'm',
  tooltip,
}) => {
  const { cases } = useKibana().services;
  const CasesContext = cases.getCasesContext();
  const userPermissions = useGetUserCasesPermissions();
  const userCanCrud = userPermissions?.crud ?? false;
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

              {!hideSubtitle && (
                <Subtitle data-test-subj="header-section-subtitle" items={subtitle} />
              )}
            </EuiFlexItem>

            {id && (
              <>
                {showInspectButton && (
                  <EuiFlexItem grow={false}>
                    <InspectButton
                      isDisabled={isInspectDisabled}
                      queryId={id}
                      multiple={inspectMultiple}
                      title={title}
                    />
                  </EuiFlexItem>
                )}
                {(getLensAttributes || lensAttributes) && timerange && (
                  <EuiFlexItem grow={false}>
                    <CasesContext owner={[APP_ID]} userCanCrud={userCanCrud ?? false}>
                      <VisualizationActions
                        getLensAttributes={getLensAttributes}
                        isInspectButtonDisabled={isInspectDisabled}
                        isMultipleQuery={inspectMultiple}
                        lensAttributes={lensAttributes}
                        queryId={id}
                        stackByField={stackByField}
                        timerange={timerange}
                        title={title}
                      />
                    </CasesContext>
                  </EuiFlexItem>
                )}
              </>
            )}

            {headerFilters && <EuiFlexItem grow={false}>{headerFilters}</EuiFlexItem>}
          </EuiFlexGroup>
        </EuiFlexItem>

        {children && (
          <EuiFlexItem data-test-subj="header-section-supplements" grow={split ? true : false}>
            {children}
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </Header>
  );
};

export const HeaderSection = React.memo(HeaderSectionComponent);
