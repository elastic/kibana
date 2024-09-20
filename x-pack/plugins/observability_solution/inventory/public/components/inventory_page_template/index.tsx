/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import React from 'react';
import { EuiBetaBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useKibana } from '../../hooks/use_kibana';

export function InventoryPageTemplate({ children }: { children: React.ReactNode }) {
  const {
    dependencies: {
      start: { observabilityShared },
    },
  } = useKibana();

  const { PageTemplate: ObservabilityPageTemplate } = observabilityShared.navigation;

  const pageTitle = (
    <EuiFlexGroup gutterSize="s">
      <EuiFlexItem grow={false}>
        {i18n.translate('xpack.inventory.inventoryPageHeaderLabel', {
          defaultMessage: 'Inventory',
        })}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBetaBadge
          iconType="beaker"
          label={i18n.translate('xpack.inventory.techPreviewBadge.label', {
            defaultMessage: 'Technical preview',
          })}
          size="m"
          color="hollow"
          tooltipContent={i18n.translate('xpack.inventory.techPreviewBadge.tooltip', {
            defaultMessage:
              'This functionality is in technical preview and may be changed or removed completely in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.',
          })}
          tooltipPosition={'right'}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <ObservabilityPageTemplate
      pageHeader={{
        pageTitle,
      }}
    >
      {children}
    </ObservabilityPageTemplate>
  );
}
