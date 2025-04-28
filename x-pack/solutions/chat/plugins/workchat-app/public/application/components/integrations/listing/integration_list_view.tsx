/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiButton } from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { i18n } from '@kbn/i18n';
import { useNavigation } from '../../../hooks/use_navigation';
import { appPaths } from '../../../app_paths';
import { integrationLabels } from '../i18n';

export const IntegrationListView: React.FC<{ tab?: string }> = ({ tab }) => {
  const { navigateToWorkchatUrl } = useNavigation();

  const tabs = useMemo(() => {
    return [
      {
        id: 'active',
        label: i18n.translate('workchatApp.integrations.listView.activeTab', {
          defaultMessage: 'Active',
        }),
        isSelected: tab === 'active',
        onClick: () => {
          navigateToWorkchatUrl(appPaths.integrations.list);
        },
      },
      {
        id: 'catalog',
        label: i18n.translate('workchatApp.integrations.listView.catalogTab', {
          defaultMessage: 'Catalog',
        }),
        isSelected: tab === 'catalog',
        onClick: () => {
          navigateToWorkchatUrl(appPaths.integrations.catalog);
        },
      },
    ];
  }, [tab, navigateToWorkchatUrl]);

  return (
    <KibanaPageTemplate.Header
      pageTitle={integrationLabels.breadcrumb.integrationsPill}
      description={i18n.translate('workchatApp.integrations.listView.description', {
        defaultMessage:
          'Connect to your tools and data so you can easily find, understand, and act on the information that matters.',
      })}
      tabs={tabs}
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
