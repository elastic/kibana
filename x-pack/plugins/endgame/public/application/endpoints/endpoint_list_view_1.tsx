/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';

import { EuiBasicTable } from '@elastic/eui';
import { EndgameAppContext } from '../../common/app_context';
import { Page } from '../../components/page';
import { SearchBar } from '../../components/search_bar';

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

interface State {
  queriedEndpointMetadata: {};
}

export class EndpointListView1 extends PureComponent {
  static contextType = EndgameAppContext;

  state = { results: [], queriedEndpointMetadata: [] };
  public updateOnChange = ({ updatedResult }: { updatedResult: {} }) => {
    this.setState({ queriedEndpointMetadata: updatedResult });
  };

  context!: React.ContextType<typeof EndgameAppContext>;

  render() {
    const { results, queriedEndpointMetadata } = this.state;

    return (
      <Page title="Endpoints">
        <SearchBar
          searchItems={results}
          defaultFields={[`_source`]}
          updateOnChange={this.updateOnChange}
        />
        <EuiBasicTable items={queriedEndpointMetadata} columns={columns} />
        <code>
          <pre>{JSON.stringify(this.state.results, null, 4)}</pre>
        </code>
      </Page>
    );
  }

  async componentDidMount() {
    // Load some API data for this component
    const results = await this.context.appContext.core.http
      .get(`${this.context.apiPrefixPath}/endpoints`)
      .catch(e => {
      console.error(e); //eslint-disable-line
        return Promise.resolve([]);
      });
    this.setState({ results, queriedEndpointMetadata: results });
  }
}
