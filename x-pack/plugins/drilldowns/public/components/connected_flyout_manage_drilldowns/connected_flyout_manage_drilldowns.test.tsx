/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { cleanup, fireEvent, render, wait } from '@testing-library/react/pure';
import '@testing-library/jest-dom/extend-expect';
import { createFlyoutManageDrilldowns } from './connected_flyout_manage_drilldowns';
import {
  dashboardDrilldownActionFactory,
  urlDrilldownActionFactory,
} from '../../../../advanced_ui_actions/public/components/action_wizard/test_data';

const FlyoutManageDrilldowns = createFlyoutManageDrilldowns({
  advancedUiActions: {
    actionFactory: {
      getAll: () => {
        return [dashboardDrilldownActionFactory, urlDrilldownActionFactory];
      },
    },
  },
});

// https://github.com/elastic/kibana/issues/59469
afterEach(cleanup);

test('<FlyoutManageDrilldowns/> should render in manage view and should allow to create new drilldown', async () => {
  const screen = render(<FlyoutManageDrilldowns context={{}} />);

  // wait for initial render. It is async because resolving compatible action factories is async
  await wait(() => expect(screen.getByText(/Manage Drilldowns/i)).toBeVisible());

  fireEvent.click(screen.getByText(/Create new/i));

  let [createHeading, createButton] = screen.getAllByText(/Create Drilldown/i);
  expect(createHeading).toBeVisible();
  expect(screen.getByLabelText(/Back/i)).toBeVisible();

  expect(createButton).toBeDisabled();

  // input drilldown name
  fireEvent.change(screen.getByLabelText(/name/i), {
    target: { value: 'Test' },
  });

  // select URL one
  fireEvent.click(screen.getByText(/Go to URL/i));

  // Input url
  const URL = 'https://elastic.co';
  fireEvent.change(screen.getByLabelText(/url/i), {
    target: { value: URL },
  });

  [createHeading, createButton] = screen.getAllByText(/Create Drilldown/i);

  expect(createButton).toBeEnabled();
  fireEvent.click(createButton);

  expect(screen.getByText(/Manage Drilldowns/i)).toBeVisible();
});
