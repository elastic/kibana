/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
} from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { useNavigation } from '../../../hooks/use_navigation';
import { appPaths } from '../../../app_paths';
import { integrationLabels } from '../i18n';


export const IntegrationListView: React.FC<{ tab?: string }> = ({ tab }) => {
  const { navigateToWorkchatUrl } = useNavigation();

  const renderTabs = () => [
    {
      id: 'active',
      label: 'Active',
      isSelected: tab === 'active',
      onClick: () => {
        navigateToWorkchatUrl(appPaths.integrations.list);
      }
    },
    {
      id: 'catalog',
      label: 'Catalog',
      isSelected: tab === 'catalog',
      onClick: () =>  {
        navigateToWorkchatUrl(appPaths.integrations.catalog);
      }
    },
  ];

  return (
      <KibanaPageTemplate.Header
        pageTitle="Integrations"
        description="Connect to your tools and data so you can easily find, understand, and act on the information that matters."
        tabs={renderTabs()}
        rightSideItems={[
          <EuiButton
            onClick={() => {
              return navigateToWorkchatUrl(appPaths.integrations.create);
            }}
            iconType="plusInCircle"
            color="primary"
            fill
          >
            {integrationLabels.listView.addIntegrationLabel}
          </EuiButton>,
        ]}
      />
  );
};
