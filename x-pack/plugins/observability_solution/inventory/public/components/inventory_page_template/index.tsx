/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useKibana } from '../../hooks/use_kibana';
import { HeaderActionMenuItems } from './header_action_menu';

export function InventoryPageTemplate({ children }: { children: React.ReactNode }) {
  const {
    services: { observabilityShared },
  } = useKibana();

  const { PageTemplate: ObservabilityPageTemplate } = observabilityShared.navigation;

  return (
    <ObservabilityPageTemplate
      pageHeader={{
        pageTitle: i18n.translate('xpack.inventory.inventoryPageHeaderLabel', {
          defaultMessage: 'Inventory',
        }),
        rightSideItems: [<HeaderActionMenuItems />],
        responsive: false,
      }}
    >
      {children}
    </ObservabilityPageTemplate>
  );
}
