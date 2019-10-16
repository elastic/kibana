/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';
import { withRouter } from 'react-router-dom';

import { EuiBasicTable, EuiLink } from '@elastic/eui';
import { EndgameAppContext } from '../../common/app_context';
import { Page } from '../../components/page';

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

export class EndpointsPage extends PureComponent {
  static contextType = EndgameAppContext;

  state = { results: [] };

  context!: React.ContextType<typeof EndgameAppContext>;

  render() {
    const { results } = this.state;

    return (
      <Page title="Endpoints">
        <EuiBasicTable items={results} columns={columns} />
        <code>
          <pre>{JSON.stringify(this.state.results, null, 4)}</pre>
        </code>
      </Page>
    );
  }

  async componentDidMount() {
    // Load some API data for this component
    const results = await this.context.appContext.core.http.get('_api/endpoints').catch(e => {
      console.error(e); //eslint-disable-line
      return Promise.resolve([]);
    });
    this.setState({ results });
  }
}
