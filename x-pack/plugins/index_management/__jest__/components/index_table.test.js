/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import sinon from 'sinon';
import { findTestSubject } from '@elastic/eui/lib/test';
import axiosXhrAdapter from 'axios/lib/adapters/xhr';

/**
 * The below import is required to avoid a console error warn from brace package
 * console.warn ../node_modules/brace/index.js:3999
      Could not load worker ReferenceError: Worker is not defined
          at createWorker (/<path-to-repo>/node_modules/brace/index.js:17992:5)
 */
import { mountWithIntl, stubWebWorker } from '@kbn/test/jest'; // eslint-disable-line no-unused-vars

import { BASE_PATH, API_BASE_PATH } from '../../common/constants';
import { AppWithoutRouter } from '../../public/application/app';
import { AppContextProvider } from '../../public/application/app_context';
import { loadIndicesSuccess } from '../../public/application/store/actions';
import { breadcrumbService } from '../../public/application/services/breadcrumbs';
import { UiMetricService } from '../../public/application/services/ui_metric';
import { notificationService } from '../../public/application/services/notification';
import { httpService } from '../../public/application/services/http';
import { setUiMetricService } from '../../public/application/services/api';
import { indexManagementStore } from '../../public/application/store';
import { setExtensionsService } from '../../public/application/store/selectors/extension_service';
import { ExtensionsService } from '../../public/services';

/* eslint-disable @kbn/eslint/no-restricted-paths */
import { notificationServiceMock } from '../../../../../src/core/public/notifications/notifications_service.mock';

const mockHttpClient = axios.create({ adapter: axiosXhrAdapter });

let server = null;
let store = null;
const indices = [];

for (let i = 0; i < 105; i++) {
  const baseFake = {
    health: i % 2 === 0 ? 'green' : 'yellow',
    status: i % 2 === 0 ? 'open' : 'closed',
    primary: 1,
    replica: 1,
    documents: 10000,
    documents_deleted: 100,
    size: '156kb',
    primary_size: '156kb',
  };
  indices.push({
    ...baseFake,
    name: `testy${i}`,
  });
  indices.push({
    ...baseFake,
    name: `.admin${i}`,
  });
}

let component = null;

// Resolve outstanding API requests. See https://www.benmvp.com/blog/asynchronous-testing-with-enzyme-react-jest/
const runAllPromises = () => new Promise(setImmediate);

const status = (rendered, row = 0) => {
  rendered.update();
  return findTestSubject(rendered, 'indexTableCell-status')
    .at(row)
    .find('.euiTableCellContent')
    .text();
};

const snapshot = (rendered) => {
  expect(rendered).toMatchSnapshot();
};

const openMenuAndClickButton = (rendered, rowIndex, buttonIndex) => {
  // Select a row.
  const checkboxes = findTestSubject(rendered, 'indexTableRowCheckbox');
  checkboxes.at(rowIndex).simulate('change', { target: { checked: true } });
  rendered.update();

  // Click the bulk actions button to open the context menu.
  const actionButton = findTestSubject(rendered, 'indexActionsContextMenuButton');
  actionButton.simulate('click');
  rendered.update();

  // Click an action in the context menu.
  const contextMenuButtons = findTestSubject(rendered, 'indexTableContextMenuButton');
  contextMenuButtons.at(buttonIndex).simulate('click');
  rendered.update();
};

const testEditor = (rendered, buttonIndex, rowIndex = 0) => {
  openMenuAndClickButton(rendered, rowIndex, buttonIndex);
  rendered.update();
  snapshot(findTestSubject(rendered, 'detailPanelTabSelected').text());
};

const testAction = (rendered, buttonIndex, rowIndex = 0) => {
  // This is leaking some implementation details about how Redux works. Not sure exactly what's going on
  // but it looks like we're aware of how many Redux actions are dispatched in response to user interaction,
  // so we "time" our assertion based on how many Redux actions we observe. This is brittle because it
  // depends upon how our UI is architected, which will affect how many actions are dispatched.
  // Expect this to break when we rearchitect the UI.
  let dispatchedActionsCount = 0;
  store.subscribe(() => {
    if (dispatchedActionsCount === 1) {
      // Take snapshot of final state.
      snapshot(status(rendered, rowIndex));
    }
    dispatchedActionsCount++;
  });

  openMenuAndClickButton(rendered, rowIndex, buttonIndex);
  // take snapshot of initial state.
  snapshot(status(rendered, rowIndex));
};

const names = (rendered) => {
  return findTestSubject(rendered, 'indexTableIndexNameLink');
};

const namesText = (rendered) => {
  return names(rendered).map((button) => button.text());
};

describe('index table', () => {
  beforeEach(() => {
    // Mock initialization of services
    const services = {
      extensionsService: new ExtensionsService(),
      uiMetricService: new UiMetricService('index_management'),
    };
    services.uiMetricService.setup({ reportUiCounter() {} });
    setExtensionsService(services.extensionsService);
    setUiMetricService(services.uiMetricService);

    // @ts-ignore
    httpService.setup(mockHttpClient);
    breadcrumbService.setup(() => undefined);
    notificationService.setup(notificationServiceMock.createStartContract());

    store = indexManagementStore(services);

    const appDependencies = { services, core: {}, plugins: {} };

    component = (
      <Provider store={store}>
        <MemoryRouter initialEntries={[`${BASE_PATH}indices`]}>
          <AppContextProvider value={appDependencies}>
            <AppWithoutRouter />
          </AppContextProvider>
        </MemoryRouter>
      </Provider>
    );

    store.dispatch(loadIndicesSuccess({ indices }));
    server = sinon.fakeServer.create();

    server.respondWith(`${API_BASE_PATH}/indices`, [
      200,
      { 'Content-Type': 'application/json' },
      JSON.stringify(indices),
    ]);

    server.respondWith([
      200,
      { 'Content-Type': 'application/json' },
      JSON.stringify({ acknowledged: true }),
    ]);

    server.respondWith(`${API_BASE_PATH}/indices/reload`, [
      200,
      { 'Content-Type': 'application/json' },
      JSON.stringify(indices),
    ]);

    server.respondImmediately = true;
  });
  afterEach(() => {
    if (!server) {
      return;
    }
    server.restore();
  });

  test('should change pages when a pagination link is clicked on', async () => {
    const rendered = mountWithIntl(component);
    await runAllPromises();
    rendered.update();

    snapshot(namesText(rendered));

    const pagingButtons = rendered.find('.euiPaginationButton');
    pagingButtons.at(2).simulate('click');
    snapshot(namesText(rendered));
  });

  test('should show more when per page value is increased', async () => {
    const rendered = mountWithIntl(component);
    await runAllPromises();
    rendered.update();

    const perPageButton = rendered.find('EuiTablePagination EuiPopover').find('button');
    perPageButton.simulate('click');
    rendered.update();

    const fiftyButton = rendered.find('.euiContextMenuItem').at(1);
    fiftyButton.simulate('click');
    rendered.update();
    expect(namesText(rendered).length).toBe(50);
  });

  test('should show the Actions menu button only when at least one row is selected', async () => {
    const rendered = mountWithIntl(component);
    await runAllPromises();
    rendered.update();

    let button = findTestSubject(rendered, 'indexTableContextMenuButton');
    expect(button.length).toEqual(0);

    const checkboxes = findTestSubject(rendered, 'indexTableRowCheckbox');
    checkboxes.at(0).simulate('change', { target: { checked: true } });
    rendered.update();
    button = findTestSubject(rendered, 'indexActionsContextMenuButton');
    expect(button.length).toEqual(1);
  });

  test('should update the Actions menu button text when more than one row is selected', async () => {
    const rendered = mountWithIntl(component);
    await runAllPromises();
    rendered.update();

    let button = findTestSubject(rendered, 'indexTableContextMenuButton');
    expect(button.length).toEqual(0);

    const checkboxes = findTestSubject(rendered, 'indexTableRowCheckbox');
    checkboxes.at(0).simulate('change', { target: { checked: true } });
    rendered.update();
    button = findTestSubject(rendered, 'indexActionsContextMenuButton');
    expect(button.text()).toEqual('Manage index');

    checkboxes.at(1).simulate('change', { target: { checked: true } });
    rendered.update();
    button = findTestSubject(rendered, 'indexActionsContextMenuButton');
    expect(button.text()).toEqual('Manage 2 indices');
  });

  test('should show system indices only when the switch is turned on', async () => {
    const rendered = mountWithIntl(component);
    await runAllPromises();
    rendered.update();

    snapshot(rendered.find('.euiPagination li').map((item) => item.text()));
    const switchControl = rendered.find('.euiSwitch__button');
    switchControl.simulate('click');
    snapshot(rendered.find('.euiPagination li').map((item) => item.text()));
  });

  test('should filter based on content of search input', async () => {
    const rendered = mountWithIntl(component);
    await runAllPromises();
    rendered.update();

    const searchInput = rendered.find('.euiFieldSearch').first();
    searchInput.instance().value = 'testy0';
    searchInput.simulate('keyup', { key: 'Enter', keyCode: 13, which: 13 });
    rendered.update();
    snapshot(namesText(rendered));
  });

  test('should sort when header is clicked', async () => {
    const rendered = mountWithIntl(component);
    await runAllPromises();
    rendered.update();

    const nameHeader = findTestSubject(rendered, 'indexTableHeaderCell-name').find('button');
    nameHeader.simulate('click');
    rendered.update();
    snapshot(namesText(rendered));

    nameHeader.simulate('click');
    rendered.update();
    snapshot(namesText(rendered));
  });

  test('should open the index detail slideout when the index name is clicked', async () => {
    const rendered = mountWithIntl(component);
    await runAllPromises();
    rendered.update();

    expect(findTestSubject(rendered, 'indexDetailFlyout').length).toBe(0);

    const indexNameLink = names(rendered).at(0);
    indexNameLink.simulate('click');
    rendered.update();
    expect(findTestSubject(rendered, 'indexDetailFlyout').length).toBe(1);
  });

  test('should show the right context menu options when one index is selected and open', async () => {
    const rendered = mountWithIntl(component);
    await runAllPromises();
    rendered.update();

    const checkboxes = findTestSubject(rendered, 'indexTableRowCheckbox');
    checkboxes.at(0).simulate('change', { target: { checked: true } });
    rendered.update();
    const actionButton = findTestSubject(rendered, 'indexActionsContextMenuButton');
    actionButton.simulate('click');
    rendered.update();
    snapshot(findTestSubject(rendered, 'indexTableContextMenuButton').map((span) => span.text()));
  });

  test('should show the right context menu options when one index is selected and closed', async () => {
    const rendered = mountWithIntl(component);
    await runAllPromises();
    rendered.update();

    const checkboxes = findTestSubject(rendered, 'indexTableRowCheckbox');
    checkboxes.at(1).simulate('change', { target: { checked: true } });
    rendered.update();
    const actionButton = findTestSubject(rendered, 'indexActionsContextMenuButton');
    actionButton.simulate('click');
    rendered.update();
    snapshot(findTestSubject(rendered, 'indexTableContextMenuButton').map((span) => span.text()));
  });

  test('should show the right context menu options when one open and one closed index is selected', async () => {
    const rendered = mountWithIntl(component);
    await runAllPromises();
    rendered.update();

    const checkboxes = findTestSubject(rendered, 'indexTableRowCheckbox');
    checkboxes.at(0).simulate('change', { target: { checked: true } });
    checkboxes.at(1).simulate('change', { target: { checked: true } });
    rendered.update();
    const actionButton = findTestSubject(rendered, 'indexActionsContextMenuButton');
    actionButton.simulate('click');
    rendered.update();
    snapshot(findTestSubject(rendered, 'indexTableContextMenuButton').map((span) => span.text()));
  });

  test('should show the right context menu options when more than one open index is selected', async () => {
    const rendered = mountWithIntl(component);
    await runAllPromises();
    rendered.update();

    const checkboxes = findTestSubject(rendered, 'indexTableRowCheckbox');
    checkboxes.at(0).simulate('change', { target: { checked: true } });
    checkboxes.at(2).simulate('change', { target: { checked: true } });
    rendered.update();
    const actionButton = findTestSubject(rendered, 'indexActionsContextMenuButton');
    actionButton.simulate('click');
    rendered.update();
    snapshot(findTestSubject(rendered, 'indexTableContextMenuButton').map((span) => span.text()));
  });

  test('should show the right context menu options when more than one closed index is selected', async () => {
    const rendered = mountWithIntl(component);
    await runAllPromises();
    rendered.update();

    const checkboxes = findTestSubject(rendered, 'indexTableRowCheckbox');
    checkboxes.at(1).simulate('change', { target: { checked: true } });
    checkboxes.at(3).simulate('change', { target: { checked: true } });
    rendered.update();
    const actionButton = findTestSubject(rendered, 'indexActionsContextMenuButton');
    actionButton.simulate('click');
    rendered.update();
    snapshot(findTestSubject(rendered, 'indexTableContextMenuButton').map((span) => span.text()));
  });

  test('flush button works from context menu', async () => {
    const rendered = mountWithIntl(component);
    await runAllPromises();
    rendered.update();
    testAction(rendered, 8);
  });

  test('clear cache button works from context menu', async () => {
    const rendered = mountWithIntl(component);
    await runAllPromises();
    rendered.update();
    testAction(rendered, 7);
  });

  test('refresh button works from context menu', async () => {
    const rendered = mountWithIntl(component);
    await runAllPromises();
    rendered.update();
    testAction(rendered, 6);
  });

  test('force merge button works from context menu', async () => {
    const rendered = mountWithIntl(component);
    await runAllPromises();
    rendered.update();

    const rowIndex = 0;
    openMenuAndClickButton(rendered, rowIndex, 5);
    snapshot(status(rendered, rowIndex));
    expect(rendered.find('.euiModal').length).toBe(1);

    let count = 0;
    store.subscribe(() => {
      if (count === 1) {
        snapshot(status(rendered, rowIndex));
        expect(rendered.find('.euiModal').length).toBe(0);
      }
      count++;
    });

    const confirmButton = findTestSubject(rendered, 'confirmModalConfirmButton');
    confirmButton.simulate('click');
    snapshot(status(rendered, rowIndex));
  });

  test('close index button works from context menu', async () => {
    const rendered = mountWithIntl(component);
    await runAllPromises();
    rendered.update();

    const modifiedIndices = indices.map((index) => {
      return {
        ...index,
        status: index.name === 'testy0' ? 'close' : index.status,
      };
    });

    server.respondWith(`${API_BASE_PATH}/indices/reload`, [
      200,
      { 'Content-Type': 'application/json' },
      JSON.stringify(modifiedIndices),
    ]);

    testAction(rendered, 4);
  });

  test('open index button works from context menu', async () => {
    const rendered = mountWithIntl(component);
    await runAllPromises();
    rendered.update();

    const modifiedIndices = indices.map((index) => {
      return {
        ...index,
        status: index.name === 'testy1' ? 'open' : index.status,
      };
    });

    server.respondWith(`${API_BASE_PATH}/indices/reload`, [
      200,
      { 'Content-Type': 'application/json' },
      JSON.stringify(modifiedIndices),
    ]);

    testAction(rendered, 3, 1);
  });

  test('show settings button works from context menu', async () => {
    const rendered = mountWithIntl(component);
    await runAllPromises();
    rendered.update();
    testEditor(rendered, 0);
  });

  test('show mappings button works from context menu', async () => {
    const rendered = mountWithIntl(component);
    await runAllPromises();
    rendered.update();
    testEditor(rendered, 1);
  });

  test('show stats button works from context menu', async () => {
    const rendered = mountWithIntl(component);
    await runAllPromises();
    rendered.update();
    testEditor(rendered, 2);
  });

  test('edit index button works from context menu', async () => {
    const rendered = mountWithIntl(component);
    await runAllPromises();
    rendered.update();
    testEditor(rendered, 3);
  });
});
