/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React, { memo, useMemo } from 'react';
import type { CommonProps } from '@elastic/eui';
import {
  EuiPageHeader,
  EuiPageSection,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiSpacer,
} from '@elastic/eui';

interface DataUsagePageProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  restrictWidth?: boolean | number;
  hasBottomBorder?: boolean;
  hideHeader?: boolean;
}

export const DataUsagePage = memo<PropsWithChildren<DataUsagePageProps & CommonProps>>(
  ({ title, subtitle, children, restrictWidth = false, hasBottomBorder = true, ...otherProps }) => {
    const header = useMemo(() => {
      return (
        <EuiFlexGroup direction="column" gutterSize="none" alignItems="flexStart">
          <EuiFlexItem grow={false}>
            <EuiTitle size="l">
              <span data-test-subj="dataUsage-page-title">{title}</span>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }, [, title]);

    const description = useMemo(() => {
      return subtitle ? (
        <span data-test-subj="dataUsage-page-description">{subtitle}</span>
      ) : undefined;
    }, [subtitle]);

    return (
      <div {...otherProps}>
        <>
          <EuiPageHeader
            pageTitle={header}
            description={description}
            bottomBorder={hasBottomBorder}
            restrictWidth={restrictWidth}
            data-test-subj={'dataUsage-page-header'}
          />
          <EuiSpacer size="l" />
        </>
        <EuiPageSection paddingSize="none" color="transparent" restrictWidth={restrictWidth}>
          {children}
        </EuiPageSection>
      </div>
    );
  }
);

DataUsagePage.displayName = 'DataUsagePage';
