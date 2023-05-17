/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';
import { FeatureNotSupported } from './feature_not_supported';

const EuiFlexGroupStyled = styled(EuiFlexGroup)`
  .formRowLabel {
    width: 170px;
  }

  .formRowValue {
    width: calc((100% - 170px) / 3);
  }
`;

export interface PolicyFormRowLayoutProps {
  label: ReactNode;
  windows?: ReactNode;
  linux?: ReactNode;
  macos?: ReactNode;
  all?: ReactNode;
}

export const PolicyFormRowLayout = memo<PolicyFormRowLayoutProps>(
  ({ label, windows, linux, macos, all }) => {
    if (all && (windows || linux || macos)) {
      throw new Error(
        `[windows], [linux] and/or [macos] props can not be used when [all] prop defined`
      );
    }

    return (
      <EuiFlexGroupStyled responsive={false} className="policyFormRow" gutterSize="s">
        <EuiFlexItem grow={false} className="formRowLabel">
          {label}
        </EuiFlexItem>
        {all ? (
          <EuiFlexItem>{all}</EuiFlexItem>
        ) : (
          <>
            <EuiFlexItem grow={false} className="formRowValue">
              {windows ?? <FeatureNotSupported />}
            </EuiFlexItem>
            <EuiFlexItem grow={false} className="formRowValue">
              {macos ?? <FeatureNotSupported />}
            </EuiFlexItem>
            <EuiFlexItem grow={false} className="formRowValue">
              {linux ?? <FeatureNotSupported />}
            </EuiFlexItem>
          </>
        )}
      </EuiFlexGroupStyled>
    );
  }
);
PolicyFormRowLayout.displayName = 'PolicyFormRowLayout';
