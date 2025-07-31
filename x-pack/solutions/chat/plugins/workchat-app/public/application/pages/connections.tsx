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
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiLoadingSpinner,
  EuiCallOut,
  EuiIcon,
  EuiButton,
  EuiBasicTable,
  EuiHealth,
  EuiToolTip,
  EuiLink,
} from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { useBreadcrumb } from '../hooks/use_breadcrumbs';
import { useIndices, type Index } from '../hooks/use_indices';

const getCapabilityColor = (capability: string): string => {
  switch (capability) {
    case 'semantic_search':
      return 'primary';
    case 'text_search':
      return 'success';
    case 'federate':
      return 'warning';
    default:
      return 'default';
  }
};

const getCapabilityLabel = (capability: string): string => {
  switch (capability) {
    case 'semantic_search':
      return 'Semantic Search';
    case 'text_search':
      return 'Text Search';
    case 'federate':
      return 'Federate';
    default:
      return capability;
  }
};

const getHealthColor = (health: string): string => {
  switch (health) {
    case 'green':
      return 'success';
    case 'yellow':
      return 'warning';
    case 'red':
      return 'danger';
    default:
      return 'subdued';
  }
};

export const ConnectionsPage: React.FC<{}> = () => {
  const { data: indices, isLoading, error } = useIndices();

  useBreadcrumb([
    {
      text: 'Data Connections',
    },
  ]);

  const columns = [
    {
      field: 'name',
      name: 'Index Name',
      render: (name: string, index: Index) => (
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem>
            <EuiLink href={`/app/elasticsearch/indices/index_details/${name}/data`}>
              <strong>{name}</strong>
            </EuiLink>
            {index.connector && (
              <>
                <br />
                <EuiText size="xs" color="subdued">
                  Connected: {index.connector.name}
                </EuiText>
              </>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
    {
      field: 'health',
      name: 'Health',
      width: '100px',
      render: (health: string) => (
        <EuiToolTip content={`Health: ${health}`}>
          <EuiHealth color={getHealthColor(health)}>{health}</EuiHealth>
        </EuiToolTip>
      ),
    },
    {
      field: 'docCount',
      name: 'Documents',
      width: '120px',
      render: (docCount: number) => docCount.toLocaleString(),
    },
    {
      field: 'storeSize',
      name: 'Size',
      width: '100px',
    },
    {
      field: 'capabilities',
      name: 'Capabilities',
      render: (capabilities: string[]) => (
        <EuiFlexGroup gutterSize="xs" wrap>
          {capabilities.slice(0, 3).map((capability) => (
            <EuiFlexItem key={capability} grow={false}>
              <EuiBadge color={getCapabilityColor(capability)}>
                {getCapabilityLabel(capability)}
              </EuiBadge>
            </EuiFlexItem>
          ))}
          {capabilities.length > 3 && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">+{capabilities.length - 3}</EuiBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      ),
    },
    {
      name: 'Actions',
      width: '80px',
      render: (index: Index) => (
        <EuiButton
          size="s"
          onClick={() => {
            console.log('Configure index connection:', index.name);
          }}
        >
          Configure
        </EuiButton>
      ),
    },
  ];

  return (
    <KibanaPageTemplate data-test-subj="connectionsPage">
      <KibanaPageTemplate.Header
        pageTitle="Data Connections"
        description="Elasticsearch indices available for WorkChat connections"
        rightSideItems={[
          <EuiButton iconType="refresh" onClick={() => window.location.reload()}>
            Refresh
          </EuiButton>,
        ]}
      />

      <KibanaPageTemplate.Section paddingSize="l">
        {/* Loading State */}
        {isLoading && (
          <EuiFlexGroup justifyContent="center">
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="l" />
              <EuiSpacer size="s" />
              <EuiText textAlign="center" color="subdued">
                Loading indices...
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}

        {/* Error State */}
        {error ? (
          <EuiCallOut title="Error loading indices" color="danger" iconType="alert">
            <p>Failed to load Elasticsearch indices. Please check your connection and try again.</p>
          </EuiCallOut>
        ) : null}

        {/* Empty State */}
        {!isLoading && !error && (!indices || indices.length === 0) && (
          <EuiCallOut title="No indices found" iconType="iInCircle" color="primary">
            <p>No Elasticsearch indices were found. Create some indices to see them listed here.</p>
          </EuiCallOut>
        )}

        {/* Indices Table */}
        {!isLoading && !error && indices && indices.length > 0 && (
          <>
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
              <EuiFlexItem>
                <EuiTitle size="s">
                  <h3>Available Indices ({indices.length})</h3>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued">
                  {indices.filter((index) => index.connector).length} connected
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiSpacer size="m" />

            <EuiBasicTable items={indices} columns={columns} tableLayout="fixed" />
          </>
        )}
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
