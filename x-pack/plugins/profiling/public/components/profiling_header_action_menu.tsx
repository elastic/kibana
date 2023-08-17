/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiHeaderLink, EuiHeaderLinks, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import qs from 'query-string';
import React from 'react';
import { useHistory } from 'react-router-dom';
import url from 'url';
import { ObservabilityAIAssistantActionMenuItem } from '@kbn/observability-ai-assistant-plugin/public';
import { useProfilingRouter } from '../hooks/use_profiling_router';
import { AddDataTabs } from '../views/add_data_view';

export function ProfilingHeaderActionMenu() {
  const router = useProfilingRouter();
  const history = useHistory();

  return (
    <EuiHeaderLinks gutterSize="xs">
      <EuiHeaderLink
        color="text"
        onClick={() => {
          const query = qs.parse(window.location.search);
          const storageExplorerURL = url.format({
            pathname: '/storage-explorer',
            query: {
              kuery: query.kuery,
              rangeFrom: query.rangeFrom,
              rangeTo: query.rangeTo,
            },
          });
          history.push(storageExplorerURL);
        }}
      >
        <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon type="beaker" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {i18n.translate('xpack.profiling.headerActionMenu.storageExplorer', {
              defaultMessage: 'Storage Explorer',
            })}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiHeaderLink>
      <EuiHeaderLink
        href={router.link('/add-data-instructions', {
          query: { selectedTab: AddDataTabs.Kubernetes },
        })}
        color="primary"
      >
        <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon type="indexOpen" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {i18n.translate('xpack.profiling.headerActionMenu.addData', {
              defaultMessage: 'Add data',
            })}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiHeaderLink>
      <ObservabilityAIAssistantActionMenuItem />
    </EuiHeaderLinks>
  );
}
