/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiProgress, EuiTitle } from '@elastic/eui';
import { AddToDashboard } from './add_to_dashboard';
import { SYNTHETICS_STATS_OVERVIEW_EMBEDDABLE } from '../../../../embeddables/constants';

export const EmbeddablePanelWrapper: FC<
  React.PropsWithChildren<{
    title: string;
    loading?: boolean;
    titleAppend?: React.ReactNode;
  }>
> = ({ children, title, loading, titleAppend }) => {
  const isSyntheticsApp = window.location.pathname.includes('/app/synthetics');

  return (
    <>
      <EuiPanel hasShadow={false} hasBorder>
        {loading && <EuiProgress size="xs" color="accent" />}
        <EuiFlexGroup>
          <EuiFlexItem grow={true}>
            <EuiTitle size="xs">
              <h3>{title}</h3>
            </EuiTitle>
          </EuiFlexItem>
          {isSyntheticsApp && (
            <EuiFlexItem grow={false}>
              <AddToDashboard type={SYNTHETICS_STATS_OVERVIEW_EMBEDDABLE} />
            </EuiFlexItem>
          )}
          {titleAppend && <EuiFlexItem grow={false}>{titleAppend}</EuiFlexItem>}
        </EuiFlexGroup>

        {children}
      </EuiPanel>
    </>
  );
};
