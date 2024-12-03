/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSkeletonTitle, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import { PrivilegesWarningIconWrapper } from '../../../common';
import { notAvailableLabel } from '../../../../../common/translations';

const verticalRule = css`
  width: 1px;
  height: 65px;
  background-color: ${euiThemeVars.euiColorLightShade};
`;

const verticalRuleHidden = css`
  width: 1px;
  height: 65px;
  visibility: hidden;
`;

export function Panel({
  title,
  secondaryTitle,
  children,
}: {
  title: string;
  secondaryTitle?: React.ReactNode;
  children: React.ReactNode | React.ReactNode[];
}) {
  const renderChildrenWithSeparator = (panelChildren: React.ReactNode | React.ReactNode[]) => {
    if (Array.isArray(panelChildren)) {
      return panelChildren.map((panelChild, index) => (
        <React.Fragment key={index}>
          {panelChild}
          {index < panelChildren.length - 1 && <span css={verticalRule} />}
        </React.Fragment>
      ));
    }
    return (
      <>
        {panelChildren}
        <span css={verticalRuleHidden} />
      </>
    );
  };
  return (
    <EuiPanel hasBorder>
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText>
              <h5>{title}</h5>
            </EuiText>
          </EuiFlexItem>
          {secondaryTitle && <EuiFlexItem grow={false}>{secondaryTitle}</EuiFlexItem>}
        </EuiFlexGroup>
      </EuiFlexGroup>
      <EuiFlexGroup gutterSize="m" alignItems="flexEnd">
        {renderChildrenWithSeparator(children)}
      </EuiFlexGroup>
    </EuiPanel>
  );
}

export function PanelIndicator({
  label,
  value,
  isLoading,
  userHasPrivilege = true,
}: {
  label: string;
  value: string | number;
  isLoading: boolean;
  userHasPrivilege?: boolean;
}) {
  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      {isLoading ? (
        <EuiSkeletonTitle size="m" />
      ) : (
        <>
          <EuiText size="xs" color="subdued">
            {label}
          </EuiText>
          <PrivilegesWarningIconWrapper
            hasPrivileges={userHasPrivilege}
            title={label}
            mode="popover"
          >
            <></>
          </PrivilegesWarningIconWrapper>
          {userHasPrivilege && (
            <EuiText size="m" data-test-subj={`datasetQualityDetailsSummaryKpiValue-${label}`}>
              <h3>{userHasPrivilege ? value : notAvailableLabel}</h3>
            </EuiText>
          )}
        </>
      )}
    </EuiFlexGroup>
  );
}
