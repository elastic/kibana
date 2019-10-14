/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';
import { EndgameAppContext } from '../../common/app_context';
import { Page } from '../../components/page';

export class EndpointsPage extends PureComponent {
  static contextType = EndgameAppContext;

  state = { results: [] };

  context!: React.ContextType<typeof EndgameAppContext>;

  render() {
    return (
      <Page title="Endpoints">
        <code>
          <pre>{JSON.stringify(this.state.results, null, 4)}</pre>
        </code>
      </Page>
    );
  }

  async componentDidMount() {
    // Load some API data for this component
    const results = await this.context.appContext.core.http.get('_api/endpoints');
    this.setState({ results });
  }
}
