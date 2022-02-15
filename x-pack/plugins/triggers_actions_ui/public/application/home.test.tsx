/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { RouteComponentProps, Router } from 'react-router-dom';
import { createMemoryHistory, createLocation } from 'history';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import TriggersActionsUIHome, { MatchParams } from './home';
import { useKibana } from '../common/lib/kibana';
jest.mock('../common/lib/kibana');
const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

describe('home', () => {
  it('renders the documentation link', async () => {
    const props: RouteComponentProps<MatchParams> = {
      history: createMemoryHistory(),
      location: createLocation('/'),
      match: {
        isExact: true,
        path: `/rules`,
        url: '',
        params: {
          section: 'rules',
        },
      },
    };

    const wrapper = mountWithIntl(
      <Router history={useKibanaMock().services.history}>
        <TriggersActionsUIHome {...props} />
      </Router>
    );
    const documentationLink = wrapper.find('[data-test-subj="documentationLink"]');
    expect(documentationLink.exists()).toBeTruthy();
    expect(documentationLink.first().prop('href')).toEqual(
      'https://www.elastic.co/guide/en/kibana/mocked-test-branch/create-and-manage-rules.html'
    );
  });
});
