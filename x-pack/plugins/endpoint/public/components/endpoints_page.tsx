/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';
import { withRouter } from 'react-router-dom';

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
// import { EndgameAppContext } from '../../common/app_context';
import { SearchBar } from './search_bar';

const EndpointName = withRouter(function({ history, path, name }) {
  return <EuiLink onClick={() => history.push(path)}>{name}</EuiLink>;
});

const columns = [
  {
    field: '_source',
    name: 'Name',
    render: source => {
      return <span>{source.host.name}</span>;
    },
  },
  {
    field: '_source',
    name: 'IP Address',
    render: source => {
      return <span>{source.host.ip}</span>;
    },
  },
  {
    field: '_source',
    name: 'Operating System',
    render: source => {
      return <span>{source.host.os.name + ' ' + source.host.os.version}</span>;
    },
  },
  {
    field: 'alert_count',
    name: 'Alerts',
  },
  {
    field: '_source',
    name: 'Host Name',
    render: source => {
      return <span>{source.host.hostname}</span>;
    },
  },
];
//
// interface State {
//   queriedEndpointMetadata: {};
// }

export class EndpointsPage extends PureComponent {
  // static contextType = EndgameAppContext;
  //
  // state = { results: [], queriedEndpointMetadata: [] };
  // public updateOnChange = ({ updatedResult }: { updatedResult: {} }) => {
  //   this.setState({ queriedEndpointMetadata: updatedResult });
  // };
  //
  // context!: React.ContextType<typeof EndgameAppContext>;

  render() {
    // const { results, queriedEndpointMetadata } = this.state;

    const queriedEndpointMetadata = [];
    const results = [];

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
              searchItems={results}
              defaultFields={[`_source`]}
              updateOnChange={() => {}}
            />
            <EuiBasicTable items={queriedEndpointMetadata} columns={columns} />
            <code>
              <pre>{JSON.stringify(results, null, 4)}</pre>
            </code>
          </EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>
    );
  }

  // async componentDidMount() {
  //   // Load some API data for this component
  //   const results = await this.context.appContext.core.http.get('_api/endpoints').catch(e => {
  //     console.error(e); //eslint-disable-line
  //     return Promise.resolve([]);
  //   });
  //   this.setState({ results, queriedEndpointMetadata: results });
  // }
}
