/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiHeaderLink, EuiHeaderLinks, EuiIcon } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useProfilingRouter } from '../hooks/use_profiling_router';
import { NoDataTabs } from '../views/no_data_view';

export function ProfilingHeaderActionMenu() {
  const router = useProfilingRouter();
  return (
    <EuiHeaderLinks gutterSize="xs">
      <EuiHeaderLink
        href={router.link('/add-data-instructions', {
          query: { selectedTab: NoDataTabs.Kubernetes },
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
    </EuiHeaderLinks>
  );
}
