/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiCard,
  EuiFlexGrid,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiSpacer,
  EuiText,
  IconType,
} from '@elastic/eui';
import { IntegrationType } from '@kbn/wci-common';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { IntegrationListView } from './integration_list_view';
import { getIntegrationIcon } from '../utils';
import { useNavigation } from '../../../hooks/use_navigation';
import { appPaths } from '../../../app_paths';

interface IntegrationCardData {
  title: string;
  icon: IconType;
  description: string;
  disabled?: boolean;
}

export const IntegrationCatalogView: React.FC = () => {
  const { navigateToWorkchatUrl } = useNavigation();

  const integrationCards: Record<IntegrationType, IntegrationCardData> = {
    [IntegrationType.index_source]: {
      title: 'Import index',
      icon: getIntegrationIcon('index_source') as IconType,
      description:
        'Choose an existing index to connect and start using it in your workflows without re-importing your data',
      disabled: false,
    },
    [IntegrationType.external_server]: {
      title: 'External Server',
      icon: getIntegrationIcon('external_server') as IconType,
      description: 'Connect to external servers for data processing.',
      disabled: false,
    },
    [IntegrationType.salesforce]: {
      title: 'Salesforce',
      icon: getIntegrationIcon('salesforce') as IconType,
      description:
        'Connect your Salesforce account to bring in customer records, case data, and account insights for use in workflows',
      disabled: false,
    },
  };

  return (
    <KibanaPageTemplate data-test-subj="integrationsCatalogPage">
      <IntegrationListView tab={'catalog'} />
      <EuiHorizontalRule margin="none" css={{ height: 2 }} />
      <KibanaPageTemplate.Section>
        <EuiText>
          <strong>Available</strong>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiFlexGrid columns={4}>
          {Object.entries(integrationCards).map(([type, cardData]) => (
            <EuiFlexItem grow={4}>
              <EuiCard
                layout="horizontal"
                icon={
                  <div
                    style={{
                      backgroundColor: '#F5F7FA',
                      borderRadius: '50%',
                      width: '60px',
                      height: '60px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginLeft: '-10px', // This pushes the icon further left
                      marginRight: '15px',
                    }}
                  >
                    <EuiIcon size="xl" type={cardData.icon} />
                  </div>
                }
                title={
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {cardData.title}
                    <EuiIcon
                      type="iInCircle"
                      size="s"
                      css={{ marginLeft: '8px', cursor: 'pointer' }}
                    />
                  </div>
                }
                titleSize="xs"
                description={cardData.description}
                paddingSize="l"
                css={{
                  border: '1px solid #D3DAE6',
                  borderRadius: '4px',
                  width: '400px',
                  height: '150px',
                }}
                onClick={() => {
                  return navigateToWorkchatUrl(`${appPaths.integrations.create}?type=${type}`);
                }}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGrid>
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
