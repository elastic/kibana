/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { IndicesStatusResponse, UserStartPrivilegesResponse } from '../../../common';

import { AnalyticsEvents } from '../../analytics/constants';
import { useUsageTracker } from '../../hooks/use_usage_tracker';

import { CreateIndexForm } from './create_index';

const MAX_WIDTH = '600px';

export interface ElasticsearchStartProps {
  indicesData?: IndicesStatusResponse;
  userPrivileges?: UserStartPrivilegesResponse;
}

export const ElasticsearchStart = ({ userPrivileges }: ElasticsearchStartProps) => {
  const usageTracker = useUsageTracker();
  useEffect(() => {
    usageTracker.load(AnalyticsEvents.startPageOpened);
  }, [usageTracker]);
  return (
    <EuiPanel
      color="subdued"
      hasShadow={false}
      hasBorder
      paddingSize="l"
      style={{ maxWidth: MAX_WIDTH, margin: '0 auto' }}
    >
      <EuiFlexGroup alignItems="flexStart">
        <EuiFlexItem grow={false}>
          <EuiIcon type="logoElasticsearch" size="xl" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel paddingSize="none" color="transparent">
            <EuiTitle size="xs">
              <h1>
                {i18n.translate('xpack.searchIndices.startPage.pageTitle', {
                  defaultMessage: 'Elasticsearch',
                })}
              </h1>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiTitle size="l">
              <h2>
                {i18n.translate('xpack.searchIndices.startPage.pageDescription', {
                  defaultMessage: 'Vectorize, search, and visualize your data',
                })}
              </h2>
            </EuiTitle>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <EuiPanel>
        <CreateIndexForm userPrivileges={userPrivileges} />
      </EuiPanel>
    </EuiPanel>
  );
};
