/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { IndicesStatusResponse, UserStartPrivilegesResponse } from '../../../common';

import { AnalyticsEvents } from '../../analytics/constants';
import { useUsageTracker } from '../../hooks/use_usage_tracker';

import { CreateIndexForm } from './create_index';
import { CreateIndexCodeView } from './create_index_code';

const MAX_WIDTH = '600px';

enum CreateIndexView {
  UI = 'ui',
  Code = 'code',
}
export interface ElasticsearchStartProps {
  indicesData?: IndicesStatusResponse;
  userPrivileges?: UserStartPrivilegesResponse;
}

export const ElasticsearchStart = ({ userPrivileges }: ElasticsearchStartProps) => {
  const [createIndexView, setCreateIndexView] = useState<CreateIndexView>(
    userPrivileges?.privileges.canCreateIndex === false ? CreateIndexView.Code : CreateIndexView.UI
  );
  const usageTracker = useUsageTracker();
  useEffect(() => {
    usageTracker.load(AnalyticsEvents.startPageOpened);
  }, [usageTracker]);
  useEffect(() => {
    if (userPrivileges === undefined) return;
    if (userPrivileges.privileges.canCreateIndex === false) {
      setCreateIndexView(CreateIndexView.Code);
    }
  }, [userPrivileges]);
  const onChangeView = useCallback(
    (id) => {
      switch (id) {
        case CreateIndexView.UI:
          usageTracker.click(AnalyticsEvents.startPageShowCreateIndexUIClick);
          setCreateIndexView(CreateIndexView.UI);
          return;
        case CreateIndexView.Code:
          usageTracker.click(AnalyticsEvents.startPageShowCodeClick);
          setCreateIndexView(CreateIndexView.Code);
          return;
      }
    },
    [usageTracker]
  );

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
        <EuiForm component="form" fullWidth>
          <EuiFlexGroup direction="column" gutterSize="m">
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiTitle size="xs">
                  <h4>
                    {i18n.translate('xpack.searchIndices.startPage.createIndex.title', {
                      defaultMessage: 'Create your first index',
                    })}
                  </h4>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonGroup
                  legend={i18n.translate(
                    'xpack.searchIndices.startPage.createIndex.viewSelec.legend',
                    { defaultMessage: 'Create index view selection' }
                  )}
                  options={[
                    {
                      id: CreateIndexView.UI,
                      label: i18n.translate(
                        'xpack.searchIndices.startPage.createIndex.viewSelect.ui',
                        { defaultMessage: 'UI' }
                      ),
                    },
                    {
                      id: CreateIndexView.Code,
                      label: i18n.translate(
                        'xpack.searchIndices.startPage.createIndex.viewSelect.code',
                        { defaultMessage: 'Code' }
                      ),
                    },
                  ]}
                  buttonSize="compressed"
                  idSelected={createIndexView}
                  onChange={onChangeView}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiText color="subdued">
              <p>
                {i18n.translate('xpack.searchIndices.startPage.createIndex.description', {
                  defaultMessage:
                    'An index stores your data and defines the schema, or field mappings, for your searches',
                })}
              </p>
            </EuiText>
            {createIndexView === CreateIndexView.UI && (
              <CreateIndexForm userPrivileges={userPrivileges} />
            )}
            {createIndexView === CreateIndexView.Code && <CreateIndexCodeView />}
          </EuiFlexGroup>
        </EuiForm>
      </EuiPanel>
    </EuiPanel>
  );
};
