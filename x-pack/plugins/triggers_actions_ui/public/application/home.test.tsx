/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { RouteComponentProps } from 'react-router-dom';
import { Router } from '@kbn/shared-ux-router';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { createMemoryHistory, createLocation } from 'history';
import { mountWithIntl } from '@kbn/test-jest-helpers';

import TriggersActionsUIHome, { MatchParams } from './home';
import { hasShowActionsCapability } from './lib/capabilities';
import { getIsExperimentalFeatureEnabled } from '../common/get_experimental_features';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('../common/lib/kibana');
jest.mock('../common/get_experimental_features');
jest.mock('./lib/capabilities');

jest.mock('./sections/rules_list/components/rules_list', () => {
  return () => <div data-test-subj="rulesListComponents">{'Render Rule list component'}</div>;
});

jest.mock('./components/health_check', () => ({
  HealthCheck: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('./context/health_context', () => ({
  HealthContextProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('./hooks/use_load_rule_types_query', () => ({
  useLoadRuleTypesQuery: jest.fn().mockReturnValue({
    authorizedToReadAnyRules: true,
  }),
}));

const { useLoadRuleTypesQuery } = jest.requireMock('./hooks/use_load_rule_types_query');

const queryClient = new QueryClient();

describe('home', () => {
  beforeEach(() => {
    (hasShowActionsCapability as jest.Mock).mockClear();
    (getIsExperimentalFeatureEnabled as jest.Mock).mockImplementation(() => false);
    useLoadRuleTypesQuery.mockClear();
  });

  it('renders rule list components', async () => {
    const props: RouteComponentProps<MatchParams> = {
      history: createMemoryHistory({
        initialEntries: ['/rules'],
      }),
      location: createLocation('/rules'),
      match: {
        isExact: true,
        path: `/rules`,
        url: '',
        params: {
          section: 'rules',
        },
      },
    };

    render(
      <IntlProvider locale="en">
        <Router history={props.history}>
          <QueryClientProvider client={queryClient}>
            <TriggersActionsUIHome {...props} />
          </QueryClientProvider>
        </Router>
      </IntlProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('rulesListComponents')).toBeInTheDocument();
    });
  });

  it('shows the correct number of tabs', async () => {
    (hasShowActionsCapability as jest.Mock).mockImplementation(() => {
      return true;
    });
    const props: RouteComponentProps<MatchParams> = {
      history: createMemoryHistory(),
      location: createLocation('/'),
      match: {
        isExact: true,
        path: `/connectors`,
        url: '',
        params: {
          section: 'connectors',
        },
      },
    };

    const home = mountWithIntl(
      <Router history={props.history}>
        <QueryClientProvider client={queryClient}>
          <TriggersActionsUIHome {...props} />
        </QueryClientProvider>
      </Router>
    );

    // Just rules and logs
    expect(home.find('span.euiTab__content').length).toBe(2);
  });

  it('hides the logs tab if the read rules privilege is missing', async () => {
    useLoadRuleTypesQuery.mockReturnValue({
      authorizedToReadAnyRules: false,
    });
    const props: RouteComponentProps<MatchParams> = {
      history: createMemoryHistory({
        initialEntries: ['/rules'],
      }),
      location: createLocation('/rules'),
      match: {
        isExact: true,
        path: `/rules`,
        url: '',
        params: {
          section: 'rules',
        },
      },
    };

    const home = mountWithIntl(
      <Router history={props.history}>
        <QueryClientProvider client={queryClient}>
          <TriggersActionsUIHome {...props} />
        </QueryClientProvider>
      </Router>
    );

    // Just rules
    expect(home.find('span.euiTab__content').length).toBe(1);
  });
});
