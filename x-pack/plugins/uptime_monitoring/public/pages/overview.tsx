/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore missing typings for EuiBreadcrumbs
import { EuiBreadcrumbs, EuiPage, EuiPageContent, EuiTitle } from '@elastic/eui';
import React from 'react';
import { BrowserRouter as Router, Link, Route, Switch } from 'react-router-dom';
import { Overview } from '../components';

const Monitor = () => <div>The monitor page!</div>;

export const MainPage = () => (
  <Router basename="/app/uptime_monitoring#/">
    <EuiPage>
      <EuiPageContent>
        <EuiBreadcrumbs breadcrumbs={[{ text: 'Parent', href: '#' }, { text: 'Child' }]} />
        <EuiTitle>
          <h2>Uptime Monitoring</h2>
        </EuiTitle>

        <Link to="/">Home</Link>
        <Link to="/monitor">Monitor</Link>

        <Switch>
          <Route path="/" exact component={Overview} />
          <Route path="/monitor" component={Monitor} />
        </Switch>
        <p>This is where the Uptime app will live.</p>
      </EuiPageContent>
    </EuiPage>
  </Router>
);
