/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect'; // TODO: this should be global
import {
  ActionFactory,
  ActionWizard,
  ActionFactoryBaseConfig,
  TEST_SUBJ_ACTION_FACTORY_ITEM,
  TEST_SUBJ_SELECTED_ACTION_FACTORY,
} from './action_wizard';
import {
  dashboardDrilldownActionFactory,
  urlDrilldownActionFactory,
  dashboards,
} from './test_data';

// TODO: for some reason global cleanup from RTL doesn't work
// afterEach is not available for it globally during setup
afterEach(cleanup);

test('Pick and configure action', () => {
  const wizardChangeFn = jest.fn();

  const screen = render(
    <ActionWizard
      actionFactories={
        [dashboardDrilldownActionFactory, urlDrilldownActionFactory] as Array<
          ActionFactory<ActionFactoryBaseConfig, unknown>
        >
      }
      onChange={wizardChangeFn}
    />
  );

  // check that all factories are displayed to pick
  expect(screen.getAllByTestId(TEST_SUBJ_ACTION_FACTORY_ITEM)).toHaveLength(2);

  // select URL one
  fireEvent.click(screen.getByText(/Go to URL/i));

  // check that wizard emitted change event. null means config is invalid. this is because URL is empty string yet
  expect(wizardChangeFn).lastCalledWith(urlDrilldownActionFactory, null);

  // Input url
  const URL = 'https://elastic.co';
  fireEvent.change(screen.getByLabelText(/url/i), {
    target: { value: URL },
  });

  // check that wizard emitted change event
  expect(wizardChangeFn).lastCalledWith(urlDrilldownActionFactory, {
    url: URL,
    openInNewTab: false,
  });

  // change to dashboard
  fireEvent.click(screen.getByText(/change/i));
  fireEvent.click(screen.getByText(/Go to Dashboard/i));

  // check that wizard emitted change event
  // null config means it is invalid. This is because no dashboard selected yet
  expect(wizardChangeFn).lastCalledWith(dashboardDrilldownActionFactory, null);

  // Select dashboard
  fireEvent.change(screen.getByLabelText(/Choose destination dashboard/i), {
    target: { value: dashboards[1].id },
  });

  // check that wizard emitted change event
  expect(wizardChangeFn).lastCalledWith(dashboardDrilldownActionFactory, {
    dashboardId: dashboards[1].id,
    useCurrentDashboardDataRange: false,
    useCurrentDashboardFilters: false,
  });
});

test('If only one actions factory is available, then no selection step is rendered and no change button displayed', () => {
  const wizardChangeFn = jest.fn();

  const screen = render(
    <ActionWizard
      actionFactories={[urlDrilldownActionFactory] as Array<ActionFactory<any, unknown>>}
      onChange={wizardChangeFn}
    />
  );

  // check that no factories are displayed to pick from
  expect(screen.queryByTestId(TEST_SUBJ_ACTION_FACTORY_ITEM)).not.toBeInTheDocument();
  expect(screen.queryByTestId(TEST_SUBJ_SELECTED_ACTION_FACTORY)).toBeInTheDocument();

  // Input url
  const URL = 'https://elastic.co';
  fireEvent.change(screen.getByLabelText(/url/i), {
    target: { value: URL },
  });

  // check that wizard emitted change event
  expect(wizardChangeFn).lastCalledWith(urlDrilldownActionFactory, {
    url: URL,
    openInNewTab: false,
  });

  // check that can't change to action factory type
  expect(screen.queryByTestId(/change/i)).not.toBeInTheDocument();
});
