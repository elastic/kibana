/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiBadgeGroup,
  EuiLoadingSpinner,
  EuiCallOut,
  EuiCard,
  EuiIcon,
  EuiButton,
  EuiStat,
  EuiEmptyPrompt,
} from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { useDataSources, DataSource } from '../../hooks/use_data_sources';
import { useNavigation } from '../../hooks/use_navigation';
import { appPaths } from '../../app_paths';

const getCategoryColor = (category: string): string => {
  switch (category) {
    case 'federated':
      return 'primary';
    case 'index_based':
      return 'success';
    default:
      return 'default';
  }
};

const getCategoryLabel = (category: string): string => {
  switch (category) {
    case 'federated':
      return 'Federated';
    case 'index_based':
      return 'Index-based';
    default:
      return category;
  }
};

const getDataSourceIcon = (dataSource: DataSource) => {
  // If iconPath is provided, use it directly
  if (dataSource.iconPath) {
    return <EuiIcon type={dataSource.iconPath} size="l" />;
  }

  // Fallback to category-based icons
  if (dataSource.category === 'federated') {
    return <EuiIcon type="globe" size="l" color="primary" />;
  }

  if (dataSource.category === 'index_based') {
    return <EuiIcon type="database" size="l" color="success" />;
  }

  // Default fallback
  return <EuiIcon type="storage" size="l" color="subdued" />;
};

export const DataSourcesCatalogView: React.FC<{}> = () => {
  const { data: dataSources, isLoading, error } = useDataSources();
  const { navigateToWorkchatUrl } = useNavigation();

  const federatedSources = dataSources?.filter((ds) => ds.category === 'federated') || [];
  const indexBasedSources = dataSources?.filter((ds) => ds.category === 'index_based') || [];

  const handleDataSourceClick = (dataSource: DataSource) => {
    console.log('Navigating to configure data source:', dataSource.type);
    const configPath = appPaths.data.sourceConfig({ type: dataSource.type });
    navigateToWorkchatUrl(configPath);
  };

  if (isLoading) {
    return (
      <KibanaPageTemplate data-test-subj="dataSourcesCatalogPage">
        <KibanaPageTemplate.Header
          pageTitle="Data Sources"
          description="Browse and manage your connected data sources"
        />
        <KibanaPageTemplate.Section>
          <EuiFlexGroup justifyContent="center">
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="l" />
              <EuiSpacer size="s" />
              <EuiText textAlign="center" color="subdued">
                Loading data sources...
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </KibanaPageTemplate.Section>
      </KibanaPageTemplate>
    );
  }

  if (error) {
    return (
      <KibanaPageTemplate data-test-subj="dataSourcesCatalogPage">
        <KibanaPageTemplate.Header
          pageTitle="Data Sources"
          description="Browse and manage your connected data sources"
        />
        <KibanaPageTemplate.Section>
          <EuiCallOut title="Error loading data sources" color="danger" iconType="alert">
            <p>Failed to load registered data sources. Please try again later.</p>
          </EuiCallOut>
        </KibanaPageTemplate.Section>
      </KibanaPageTemplate>
    );
  }

  if (!dataSources || dataSources.length === 0) {
    return (
      <KibanaPageTemplate data-test-subj="dataSourcesCatalogPage">
        <KibanaPageTemplate.Header
          pageTitle="Data Sources"
          description="Browse and manage your connected data sources"
        />
        <KibanaPageTemplate.Section>
          <EuiEmptyPrompt
            icon={<EuiIcon type="database" size="xxl" />}
            title={<h2>No Data Sources Available</h2>}
            body={
              <EuiText color="subdued" textAlign="center">
                <p>
                  No data sources have been registered yet. Contact your administrator to configure
                  data sources or check back later.
                </p>
              </EuiText>
            }
            actions={[
              <EuiButton fill disabled>
                Configure Data Sources
              </EuiButton>,
            ]}
          />
        </KibanaPageTemplate.Section>
      </KibanaPageTemplate>
    );
  }

  return (
    <KibanaPageTemplate data-test-subj="dataSourcesCatalogPage">
      <KibanaPageTemplate.Header
        pageTitle="Data Sources"
        description="Browse and manage your connected data sources"
      />

      <KibanaPageTemplate.Section paddingSize="l">
        {/* Overview Stats */}
        <EuiPanel color="subdued" paddingSize="l">
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
            <EuiFlexItem>
              <EuiTitle size="m">
                <h2>Data Sources Overview</h2>
              </EuiTitle>
              <EuiText color="subdued">
                <p>Connect to various data sources to power your WorkChat experience</p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="xl">
                <EuiFlexItem grow={false}>
                  <EuiStat
                    title={federatedSources.length.toString()}
                    description="Federated Sources"
                    titleColor="primary"
                    textAlign="center"
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiStat
                    title={indexBasedSources.length.toString()}
                    description="Index-based Sources"
                    titleColor="success"
                    textAlign="center"
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>

        <EuiSpacer size="l" />

        {/* Federated Sources */}
        {federatedSources.length > 0 && (
          <>
            <EuiTitle size="s">
              <h3>
                <EuiIcon type="globe" size="m" style={{ marginRight: '8px' }} />
                Federated Data Sources ({federatedSources.length})
              </h3>
            </EuiTitle>

            <EuiText color="subdued">
              <p>External data sources that can be connected to WorkChat via connectors.</p>
            </EuiText>

            <EuiSpacer size="m" />

            <EuiFlexGroup gutterSize="m" wrap>
              {federatedSources.map((dataSource) => (
                <EuiFlexItem key={dataSource.type} style={{ minWidth: '300px', maxWidth: '400px' }}>
                  <EuiCard
                    icon={getDataSourceIcon(dataSource)}
                    title={dataSource.name}
                    description={dataSource.description}
                    footer={
                      <EuiFlexGroup direction="column" gutterSize="s">
                        <EuiFlexItem>
                          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                            <EuiFlexItem grow={false}>
                              <EuiBadge color={getCategoryColor(dataSource.category)}>
                                {getCategoryLabel(dataSource.category)}
                              </EuiBadge>
                            </EuiFlexItem>
                            <EuiFlexItem grow={false}>
                              <EuiText size="xs" color="subdued">
                                {dataSource.provider}
                              </EuiText>
                            </EuiFlexItem>
                          </EuiFlexGroup>
                        </EuiFlexItem>
                        {dataSource.tags && dataSource.tags.length > 0 && (
                          <EuiFlexItem>
                            <EuiBadgeGroup gutterSize="xs">
                              {dataSource.tags.slice(0, 3).map((tag) => (
                                <EuiBadge key={tag} color="hollow">
                                  {tag}
                                </EuiBadge>
                              ))}
                              {dataSource.tags.length > 3 && (
                                <EuiBadge color="hollow">
                                  +{dataSource.tags.length - 3} more
                                </EuiBadge>
                              )}
                            </EuiBadgeGroup>
                          </EuiFlexItem>
                        )}
                      </EuiFlexGroup>
                    }
                    onClick={() => handleDataSourceClick(dataSource)}
                    selectable={{
                      onClick: () => {},
                      isSelected: false,
                    }}
                    hasBorder
                  />
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>

            <EuiSpacer size="l" />
          </>
        )}

        {/* Index-based Sources */}
        {indexBasedSources.length > 0 && (
          <>
            <EuiTitle size="s">
              <h3>
                <EuiIcon type="database" size="m" style={{ marginRight: '8px' }} />
                Index-based Data Sources ({indexBasedSources.length})
              </h3>
            </EuiTitle>

            <EuiText color="subdued">
              <p>Direct connections to Elasticsearch indices for immediate data access.</p>
            </EuiText>

            <EuiSpacer size="m" />

            <EuiFlexGroup gutterSize="m" wrap>
              {indexBasedSources.map((dataSource) => (
                <EuiFlexItem key={dataSource.type} style={{ minWidth: '300px', maxWidth: '400px' }}>
                  <EuiCard
                    icon={getDataSourceIcon(dataSource)}
                    title={dataSource.name}
                    description={dataSource.description}
                    footer={
                      <EuiFlexGroup direction="column" gutterSize="s">
                        <EuiFlexItem>
                          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                            <EuiFlexItem grow={false}>
                              <EuiBadge color={getCategoryColor(dataSource.category)}>
                                {getCategoryLabel(dataSource.category)}
                              </EuiBadge>
                            </EuiFlexItem>
                            <EuiFlexItem grow={false}>
                              <EuiText size="xs" color="subdued">
                                {dataSource.provider}
                              </EuiText>
                            </EuiFlexItem>
                          </EuiFlexGroup>
                        </EuiFlexItem>
                        {dataSource.tags && dataSource.tags.length > 0 && (
                          <EuiFlexItem>
                            <EuiBadgeGroup gutterSize="xs">
                              {dataSource.tags.slice(0, 3).map((tag) => (
                                <EuiBadge key={tag} color="hollow">
                                  {tag}
                                </EuiBadge>
                              ))}
                              {dataSource.tags.length > 3 && (
                                <EuiBadge color="hollow">
                                  +{dataSource.tags.length - 3} more
                                </EuiBadge>
                              )}
                            </EuiBadgeGroup>
                          </EuiFlexItem>
                        )}
                      </EuiFlexGroup>
                    }
                    onClick={() => handleDataSourceClick(dataSource)}
                    selectable={{
                      onClick: () => {},
                      isSelected: false,
                    }}
                    hasBorder
                  />
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </>
        )}
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
