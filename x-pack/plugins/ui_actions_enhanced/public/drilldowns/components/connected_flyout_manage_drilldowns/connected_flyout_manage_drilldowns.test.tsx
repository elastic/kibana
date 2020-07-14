/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { cleanup, fireEvent, render, wait } from '@testing-library/react/pure';
import { createFlyoutManageDrilldowns } from './connected_flyout_manage_drilldowns';
import { dashboardFactory, urlFactory } from '../../../components/action_wizard/test_data';
import { StubBrowserStorage } from '../../../../../../../src/test_utils/public/stub_browser_storage';
import { Storage } from '../../../../../../../src/plugins/kibana_utils/public';
import { mockDynamicActionManager } from './test_data';
import { TEST_SUBJ_DRILLDOWN_ITEM } from '../list_manage_drilldowns';
import { WELCOME_MESSAGE_TEST_SUBJ } from '../drilldown_hello_bar';
import { coreMock } from '../../../../../../../src/core/public/mocks';
import { NotificationsStart } from 'kibana/public';
import { toastDrilldownsCRUDError } from './i18n';
import { ActionFactory } from '../../../dynamic_actions';

const storage = new Storage(new StubBrowserStorage());
const toasts = coreMock.createStart().notifications.toasts;
const FlyoutManageDrilldowns = createFlyoutManageDrilldowns({
  actionFactories: [dashboardFactory as ActionFactory, urlFactory as ActionFactory],
  storage: new Storage(new StubBrowserStorage()),
  toastService: toasts,
});

// https://github.com/elastic/kibana/issues/59469
afterEach(cleanup);

beforeEach(() => {
  storage.clear();
  (toasts as jest.Mocked<NotificationsStart['toasts']>).addSuccess.mockClear();
  (toasts as jest.Mocked<NotificationsStart['toasts']>).addError.mockClear();
});

test('Allows to manage drilldowns', async () => {
  const screen = render(<FlyoutManageDrilldowns dynamicActionManager={mockDynamicActionManager} />);

  // wait for initial render. It is async because resolving compatible action factories is async
  await wait(() => expect(screen.getByText(/Manage Drilldowns/i)).toBeVisible());

  // no drilldowns in the list
  expect(screen.queryAllByTestId(TEST_SUBJ_DRILLDOWN_ITEM)).toHaveLength(0);

  fireEvent.click(screen.getByText(/Create new/i));

  let [createHeading, createButton] = screen.getAllByText(/Create Drilldown/i);
  expect(createHeading).toBeVisible();
  expect(screen.getByLabelText(/Back/i)).toBeVisible();

  expect(createButton).toBeDisabled();

  // input drilldown name
  const name = 'Test name';
  fireEvent.change(screen.getByLabelText(/name/i), {
    target: { value: name },
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

  await wait(() => expect(screen.queryAllByTestId(TEST_SUBJ_DRILLDOWN_ITEM)).toHaveLength(1));
  expect(screen.getByText(name)).toBeVisible();
  const editButton = screen.getByText(/edit/i);
  fireEvent.click(editButton);

  expect(screen.getByText(/Edit Drilldown/i)).toBeVisible();
  // check that wizard is prefilled with current drilldown values
  expect(screen.getByLabelText(/name/i)).toHaveValue(name);
  expect(screen.getByLabelText(/url/i)).toHaveValue(URL);

  // input new drilldown name
  const newName = 'New drilldown name';
  fireEvent.change(screen.getByLabelText(/name/i), {
    target: { value: newName },
  });
  fireEvent.click(screen.getByText(/save/i));

  expect(screen.getByText(/Manage Drilldowns/i)).toBeVisible();
  await wait(() => screen.getByText(newName));

  // delete drilldown from edit view
  fireEvent.click(screen.getByText(/edit/i));
  fireEvent.click(screen.getByText(/delete/i));

  expect(screen.getByText(/Manage Drilldowns/i)).toBeVisible();
  await wait(() => expect(screen.queryAllByTestId(TEST_SUBJ_DRILLDOWN_ITEM)).toHaveLength(0));
});

test('Can delete multiple drilldowns', async () => {
  const screen = render(<FlyoutManageDrilldowns dynamicActionManager={mockDynamicActionManager} />);
  // wait for initial render. It is async because resolving compatible action factories is async
  await wait(() => expect(screen.getByText(/Manage Drilldowns/i)).toBeVisible());

  const createDrilldown = async () => {
    const oldCount = screen.queryAllByTestId(TEST_SUBJ_DRILLDOWN_ITEM).length;
    fireEvent.click(screen.getByText(/Create new/i));
    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: 'test' },
    });
    fireEvent.click(screen.getByText(/Go to URL/i));
    fireEvent.change(screen.getByLabelText(/url/i), {
      target: { value: 'https://elastic.co' },
    });
    fireEvent.click(screen.getAllByText(/Create Drilldown/i)[1]);
    await wait(() =>
      expect(screen.queryAllByTestId(TEST_SUBJ_DRILLDOWN_ITEM)).toHaveLength(oldCount + 1)
    );
  };

  await createDrilldown();
  await createDrilldown();
  await createDrilldown();

  const checkboxes = screen.getAllByLabelText(/Select this drilldown/i);
  expect(checkboxes).toHaveLength(3);
  checkboxes.forEach((checkbox) => fireEvent.click(checkbox));
  expect(screen.queryByText(/Create/i)).not.toBeInTheDocument();
  fireEvent.click(screen.getByText(/Delete \(3\)/i));

  await wait(() => expect(screen.queryAllByTestId(TEST_SUBJ_DRILLDOWN_ITEM)).toHaveLength(0));
});

test('Create only mode', async () => {
  const onClose = jest.fn();
  const screen = render(
    <FlyoutManageDrilldowns
      dynamicActionManager={mockDynamicActionManager}
      viewMode={'create'}
      onClose={onClose}
    />
  );
  // wait for initial render. It is async because resolving compatible action factories is async
  await wait(() => expect(screen.getAllByText(/Create/i).length).toBeGreaterThan(0));
  fireEvent.change(screen.getByLabelText(/name/i), {
    target: { value: 'test' },
  });
  fireEvent.click(screen.getByText(/Go to URL/i));
  fireEvent.change(screen.getByLabelText(/url/i), {
    target: { value: 'https://elastic.co' },
  });
  fireEvent.click(screen.getAllByText(/Create Drilldown/i)[1]);

  await wait(() => expect(toasts.addSuccess).toBeCalled());
  expect(onClose).toBeCalled();
  expect(await mockDynamicActionManager.state.get().events.length).toBe(1);
});

test('After switching between action factories state is restored', async () => {
  const screen = render(
    <FlyoutManageDrilldowns dynamicActionManager={mockDynamicActionManager} viewMode={'create'} />
  );
  // wait for initial render. It is async because resolving compatible action factories is async
  await wait(() => expect(screen.getAllByText(/Create/i).length).toBeGreaterThan(0));
  fireEvent.change(screen.getByLabelText(/name/i), {
    target: { value: 'test' },
  });
  fireEvent.click(screen.getByText(/Go to URL/i));
  fireEvent.change(screen.getByLabelText(/url/i), {
    target: { value: 'https://elastic.co' },
  });

  // change to dashboard
  fireEvent.click(screen.getByText(/change/i));
  fireEvent.click(screen.getByText(/Go to Dashboard/i));

  // change back to url
  fireEvent.click(screen.getByText(/change/i));
  fireEvent.click(screen.getByText(/Go to URL/i));

  expect(screen.getByLabelText(/url/i)).toHaveValue('https://elastic.co');
  expect(screen.getByLabelText(/name/i)).toHaveValue('test');

  fireEvent.click(screen.getAllByText(/Create Drilldown/i)[1]);
  await wait(() => expect(toasts.addSuccess).toBeCalled());
  expect(await (mockDynamicActionManager.state.get().events[0].action.config as any).url).toBe(
    'https://elastic.co'
  );
});

test.todo("Error when can't fetch drilldown list");

test("Error when can't save drilldown changes", async () => {
  const error = new Error('Oops');
  jest.spyOn(mockDynamicActionManager, 'createEvent').mockImplementationOnce(async () => {
    throw error;
  });
  const screen = render(<FlyoutManageDrilldowns dynamicActionManager={mockDynamicActionManager} />);
  // wait for initial render. It is async because resolving compatible action factories is async
  await wait(() => expect(screen.getByText(/Manage Drilldowns/i)).toBeVisible());
  fireEvent.click(screen.getByText(/Create new/i));
  fireEvent.change(screen.getByLabelText(/name/i), {
    target: { value: 'test' },
  });
  fireEvent.click(screen.getByText(/Go to URL/i));
  fireEvent.change(screen.getByLabelText(/url/i), {
    target: { value: 'https://elastic.co' },
  });
  fireEvent.click(screen.getAllByText(/Create Drilldown/i)[1]);
  await wait(() =>
    expect(toasts.addError).toBeCalledWith(error, { title: toastDrilldownsCRUDError })
  );
});

test('Should show drilldown welcome message. Should be able to dismiss it', async () => {
  let screen = render(<FlyoutManageDrilldowns dynamicActionManager={mockDynamicActionManager} />);

  // wait for initial render. It is async because resolving compatible action factories is async
  await wait(() => expect(screen.getByText(/Manage Drilldowns/i)).toBeVisible());

  expect(screen.getByTestId(WELCOME_MESSAGE_TEST_SUBJ)).toBeVisible();
  fireEvent.click(screen.getByText(/hide/i));
  expect(screen.queryByTestId(WELCOME_MESSAGE_TEST_SUBJ)).toBeNull();
  cleanup();

  screen = render(<FlyoutManageDrilldowns dynamicActionManager={mockDynamicActionManager} />);
  // wait for initial render. It is async because resolving compatible action factories is async
  await wait(() => expect(screen.getByText(/Manage Drilldowns/i)).toBeVisible());
  expect(screen.queryByTestId(WELCOME_MESSAGE_TEST_SUBJ)).toBeNull();
});
