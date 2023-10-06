/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { usePluginContext } from '../../hooks/use_plugin_context';

const TestBox: React.FC = ({ children }) => (
  <div style={{ padding: 20, border: '1px solid magenta' }}>{children}</div>
);

export function AssetsInventoryPage() {
  const { ObservabilityPageTemplate } = usePluginContext();
  return (
    <ObservabilityPageTemplate
      data-test-subj="assetsInventoryPageWithData"
      pageHeader={{
        pageTitle: (
          <>
            {i18n.translate('xpack.observability.assetsInventoryTitle', {
              defaultMessage: 'Assets Inventory',
            })}{' '}
          </>
        ),
      }}
    >
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem>
          <TestBox>Area 1</TestBox>
        </EuiFlexItem>
        <EuiFlexItem>
          <TestBox>Area 2</TestBox>
        </EuiFlexItem>
        <EuiFlexItem>
          <TestBox>Area 3, Table</TestBox>
        </EuiFlexItem>
      </EuiFlexGroup>
    </ObservabilityPageTemplate>
  );
}
