/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiPageSideBar,
  EuiTitle,
  EuiSideNav,
  EuiBasicTable,
} from '@elastic/eui';
export const Management = ({ endpointMetadata }: { endpointMetadata: any }) => {
  const endpointMetadataTable = (tableData: any) => {
    const items = tableData.hits.hits;

    const columns = [
      {
        field: '_source',
        name: 'Hostname',
        sortable: true,
        render: source => {
          return <span>{source.host.hostname}</span>;
        },
        truncateText: false,
      },
      {
        field: '_source',
        name: 'IP',
        sortable: true,
        render: source => {
          return <span>{source.host.ip}</span>;
        },
        truncateText: false,
      },
      {
        field: '_source',
        name: 'Operating System',
        sortable: true,
        render: source => {
          return <span>{source.host.os.name + ' ' + source.host.os.version}</span>;
        },
        truncateText: false,
      },
      {
        field: '_source',
        name: 'Sensor Version',
        sortable: true,
        render: source => {
          return <span>{source.agent.version}</span>;
        },
        truncateText: false,
      },
    ];

    return <EuiBasicTable items={items} columns={columns} />;
  };
  return (
    <EuiPageBody data-test-subj="fooAppPageA">
      <EuiPageHeader>
        <EuiPageHeaderSection>
          <EuiTitle size="l">
            <h1>Endpoint Management</h1>
          </EuiTitle>
        </EuiPageHeaderSection>
      </EuiPageHeader>
      <EuiPageContent>
        <EuiPageContentHeader>
          <EuiPageContentHeaderSection>
            <EuiTitle>
              <h2>Manage your Endpoints</h2>
            </EuiTitle>
          </EuiPageContentHeaderSection>
        </EuiPageContentHeader>
        <EuiPageContentBody>
          Here's your Endpoints
          {endpointMetadataTable(endpointMetadata)}
        </EuiPageContentBody>
      </EuiPageContent>
    </EuiPageBody>
  );
};
