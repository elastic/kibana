/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiTitle,
  EuiText,
  EuiLink,
  useEuiTheme,
  EuiSkeletonTitle,
  EuiSkeletonRectangle,
} from '@elastic/eui';

import { PrivilegesWarningIconWrapper } from '../../common';
import { notAvailableLabel } from '../../../../common/translations';
import type { getSummaryKpis } from './get_summary_kpis';

export function FlyoutSummaryKpiItem({
  title,
  value,
  link,
  isLoading,
  userHasPrivilege,
}: ReturnType<typeof getSummaryKpis>[number] & { isLoading: boolean }) {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel
      data-test-subj={`datasetQualityFlyoutKpi-${title}${isLoading ? '--loading' : ''}`}
      css={{ minWidth: 152, height: 130, display: 'flex', alignItems: 'stretch' }}
      hasBorder
      grow={false}
      paddingSize="s"
    >
      <EuiFlexGroup alignItems="stretch" direction="column" wrap={false}>
        <EuiFlexItem css={{ gap: euiTheme.size.xs }}>
          <EuiFlexGroup>
            <EuiTitle data-test-subj={`datasetQualityFlyoutKpiTitle-${title}`} size="xxxs">
              <h6>{title}</h6>
            </EuiTitle>

            <PrivilegesWarningIconWrapper
              hasPrivileges={userHasPrivilege}
              title={title}
              mode="popover"
              popoverCss={{ marginLeft: 'auto' }}
            >
              <></>
            </PrivilegesWarningIconWrapper>
          </EuiFlexGroup>
          {link ? (
            <EuiLink
              data-test-subj={`datasetQualityFlyoutKpiLink-${title}`}
              css={{
                display: 'flex',
                alignItems: 'center',
                width: 'fit-content',
              }}
              {...link.props}
            >
              <EuiText
                css={{
                  fontWeight: euiTheme.font.weight.semiBold,
                  whiteSpace: 'nowrap',
                }}
                size="xs"
              >
                {link.label}
              </EuiText>
            </EuiLink>
          ) : null}
        </EuiFlexItem>
        <EuiFlexItem
          css={{ alignItems: isLoading ? 'stretch' : 'flex-end', justifyContent: 'flex-end' }}
        >
          <EuiSkeletonTitle
            style={{ width: '50%', marginLeft: 'auto' }}
            size="m"
            isLoading={isLoading}
          >
            <EuiTitle data-test-subj={`datasetQualityFlyoutKpiValue-${title}`} size="s">
              <h3 className="eui-textNoWrap">{userHasPrivilege ? value : notAvailableLabel}</h3>
            </EuiTitle>
          </EuiSkeletonTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}

export function FlyoutSummaryKpiItemLoading({ title }: { title: string }) {
  return (
    <EuiSkeletonRectangle
      data-test-subj={`datasetQualityFlyoutKpi-${title}--loading`}
      css={{ minWidth: 152 }}
      width={'100%'}
      height={130}
    />
  );
}
