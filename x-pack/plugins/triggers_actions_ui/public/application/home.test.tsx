/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { RouteComponentProps, Router } from 'react-router-dom';
import { createMemoryHistory, createLocation } from 'history';
import { mountWithIntl } from 'test_utils/enzyme_helpers';

import TriggersActionsUIHome, { MatchParams } from './home';
import { AppContextProvider } from './app_context';
import { getMockedAppDependencies } from './test_utils';

describe('home', () => {
  it('renders the documentation link', async () => {
    const deps = await getMockedAppDependencies();

    const props: RouteComponentProps<MatchParams> = {
      history: createMemoryHistory(),
      location: createLocation('/'),
      match: {
        isExact: true,
        path: `/alerts`,
        url: '',
        params: {
          section: 'alerts',
        },
      },
    };
    const wrapper = mountWithIntl(
      <Router history={deps.history}>
        <AppContextProvider appDeps={deps}>
          <TriggersActionsUIHome {...props} />
        </AppContextProvider>
      </Router>
    );
    const documentationLink = wrapper.find('[data-test-subj="documentationLink"]');
    expect(documentationLink.exists()).toBeTruthy();
    expect(documentationLink.first().prop('href')).toEqual(
      'https://www.elastic.co/guide/en/kibana/mocked-test-branch/managing-alerts-and-actions.html'
    );
  });
});
