/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import { connect } from 'react-redux';
import {
  EuiBasicTable,
  EuiLink,
  EuiPageHeader,
  EuiPageBody,
  EuiPageHeaderSection,
  EuiTitle,
  EuiPageContent,
  EuiPageContentHeader,
  EuiPageContentBody,
  EuiPageContentHeaderSection,
} from '@elastic/eui';
import { SearchBar } from './search_bar';
import {
  endpointsListData,
  isFiltered,
  filteredEndpointListData,
} from '../selectors/endpoints_list';
import { actions, EndpointListActions } from '../actions/endpoints_list';

const EndpointName = withRouter<RouteComponentProps & { path: string; name: string }>(function({
  history,
  path,
  name,
}) {
  return <EuiLink onClick={() => history.push(path)}>{name}</EuiLink>;
});

const columns = [
  {
    field: '_source.host.hostname',
    name: 'Name',
    render: (name: string, item: { _id: string }) => {
      return <EndpointName name={name} path={`/endpoints/view/${item._id}`} />;
    },
  },
  {
    field: '_source.host.ip',
    name: 'IP Address',
  },
  {
    field: '_source.host.os.full',
    name: 'Operating System',
  },
  {
    field: '_source.endpoint.domain',
    name: 'Domain',
  },
  {
    field: '_source.host.name',
    name: 'Host Name',
  },
];

export class EndpointsPage extends PureComponent<{
  endpoints: any[];
  userFilteredData: EndpointListActions;
  showFiltered: boolean;
  filteredEndpoints: any[];
}> {
  render() {
    const { endpoints, userFilteredData, showFiltered, filteredEndpoints } = this.props;

    return (
      <EuiPageBody>
        <EuiPageHeader>
          <EuiPageHeaderSection>
            <EuiTitle size="l">
              <h1>Endpoints</h1>
            </EuiTitle>
          </EuiPageHeaderSection>
        </EuiPageHeader>
        <EuiPageContent>
          <EuiPageContentHeader>
            <EuiPageContentHeaderSection>
              <EuiTitle>
                <h2>Endpoint List</h2>
              </EuiTitle>
            </EuiPageContentHeaderSection>
          </EuiPageContentHeader>
          <EuiPageContentBody>
            <SearchBar
              searchItems={endpoints}
              defaultFields={[`_source`]}
              updateOnChange={({ updatedResult }: { updatedResult: any[] }) =>
                userFilteredData({ filteredData: updatedResult, isFiltered: true })
              }
            />
            <EuiBasicTable items={showFiltered ? filteredEndpoints : endpoints} columns={columns} />
            <code>
              <pre>{JSON.stringify(endpoints, null, 4)}</pre>
            </code>
          </EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>
    );
  }
}

export const EndpointsPageConnected = connect(
  state => {
    return {
      endpoints: endpointsListData(state),
      showFiltered: isFiltered(state),
      filteredEndpoints: filteredEndpointListData(state),
    };
  },
  {
    userFilteredData: actions.userFilteredData,
  }
)(EndpointsPage);
