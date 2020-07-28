/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react/pure';
import { TEST_SUBJ_ACTION_FACTORY_ITEM, TEST_SUBJ_SELECTED_ACTION_FACTORY } from './action_wizard';
import {
  dashboardFactory,
  dashboards,
  Demo,
  urlFactory,
  urlDrilldownActionFactory,
} from './test_data';
import { ActionFactory } from '../../dynamic_actions';
import { licenseMock } from '../../../../licensing/common/licensing.mock';

// TODO: afterEach is not available for it globally during setup
// https://github.com/elastic/kibana/issues/59469
afterEach(cleanup);

test('Pick and configure action', () => {
  const screen = render(<Demo actionFactories={[dashboardFactory, urlFactory]} />);

  // check that all factories are displayed to pick
  expect(screen.getAllByTestId(new RegExp(TEST_SUBJ_ACTION_FACTORY_ITEM))).toHaveLength(2);

  // select URL one
  fireEvent.click(screen.getByText(/Go to URL/i));

  // Input url
  const URL = 'https://elastic.co';
  fireEvent.change(screen.getByLabelText(/url/i), {
    target: { value: URL },
  });

  // change to dashboard
  fireEvent.click(screen.getByText(/change/i));
  fireEvent.click(screen.getByText(/Go to Dashboard/i));

  // Select dashboard
  fireEvent.change(screen.getByLabelText(/Choose destination dashboard/i), {
    target: { value: dashboards[1].id },
  });
});

test('If only one actions factory is available then actionFactory selection is emitted without user input', () => {
  const screen = render(<Demo actionFactories={[urlFactory]} />);

  // check that no factories are displayed to pick from
  expect(screen.queryByTestId(new RegExp(TEST_SUBJ_ACTION_FACTORY_ITEM))).not.toBeInTheDocument();
  expect(screen.queryByTestId(new RegExp(TEST_SUBJ_SELECTED_ACTION_FACTORY))).toBeInTheDocument();

  // Input url
  const URL = 'https://elastic.co';
  fireEvent.change(screen.getByLabelText(/url/i), {
    target: { value: URL },
  });

  // check that can't change to action factory type
  expect(screen.queryByTestId(/change/i)).not.toBeInTheDocument();
});

test('If not enough license, button is disabled', () => {
  const urlWithGoldLicense = new ActionFactory(
    {
      ...urlDrilldownActionFactory,
      minimalLicense: 'gold',
    },
    () => licenseMock.createLicense()
  );
  const screen = render(<Demo actionFactories={[dashboardFactory, urlWithGoldLicense]} />);

  // check that all factories are displayed to pick
  expect(screen.getAllByTestId(new RegExp(TEST_SUBJ_ACTION_FACTORY_ITEM))).toHaveLength(2);

  expect(screen.getByText(/Go to URL/i)).toBeDisabled();
});
