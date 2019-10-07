/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';
import { EndgameAppContext } from '../../common/app_context';

export class EndpointsPage extends PureComponent {
  static contextType = EndgameAppContext;

  state = { results: [] };

  render() {
    return (
      <div>
        <h1>Endpoints page</h1>
        <code>
          <pre>{JSON.stringify(this.state.results, null, 4)}</pre>
        </code>
      </div>
    );
  }

  async componentDidMount() {
    // Load some API data for this component
    const results = await this.context.appContext.core.http.get('_api/endpoints');
    this.setState({ results });
  }
}
