/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { RouteComponentProps, Router } from 'react-router-dom';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { createMemoryHistory, createLocation } from 'history';
import { mountWithIntl } from '@kbn/test-jest-helpers';

import TriggersActionsUIHome, { MatchParams } from './home';
import { hasShowActionsCapability } from './lib/capabilities';
import { getIsExperimentalFeatureEnabled } from '../common/get_experimental_features';

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

describe('home', () => {
  beforeEach(() => {
    (hasShowActionsCapability as jest.Mock).mockClear();
    (getIsExperimentalFeatureEnabled as jest.Mock).mockClear();
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
          <TriggersActionsUIHome {...props} />
        </Router>
      </IntlProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('rulesListComponents')).toBeInTheDocument();
    });
  });

  it('hides the internal alerts table route if the config is not set', async () => {
    (hasShowActionsCapability as jest.Mock).mockImplementation(() => {
      return true;
    });
    const props: RouteComponentProps<MatchParams> = {
      history: createMemoryHistory(),
      location: createLocation('/'),
      match: {
        isExact: true,
        path: `/connectorss`,
        url: '',
        params: {
          section: 'connectors',
        },
      },
    };

    let home = mountWithIntl(
      <Router history={props.history}>
        <TriggersActionsUIHome {...props} />
      </Router>
    );

    // Just rules/logs
    expect(home.find('span.euiTab__content').length).toBe(2);

    (getIsExperimentalFeatureEnabled as jest.Mock).mockImplementation((feature: string) => {
      if (feature === 'internalAlertsTable') {
        return true;
      }
      return false;
    });

    home = mountWithIntl(
      <Router history={props.history}>
        <TriggersActionsUIHome {...props} />
      </Router>
    );
    // alerts now too!
    expect(home.find('span.euiTab__content').length).toBe(3);
  });
});
