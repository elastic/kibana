/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { setupEnvironment } from '../helpers';
import { SearchIndexDetailsPageTestBed, setup } from './search_index_details_page.helpers';
import { breadcrumbService } from '../../../public/application/services/breadcrumbs';
import { act } from 'react-dom/test-utils';
import { testIndexMock, testIndexName } from '../index_details_page/mocks';
import { API_BASE_PATH } from '../../../common';

describe('<SearchIndexDetailsPage />', () => {
  let testBed: SearchIndexDetailsPageTestBed;
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  jest.spyOn(breadcrumbService, 'setBreadcrumbs');

  beforeEach(async () => {
    const mockEnvironment = setupEnvironment();
    ({ httpSetup, httpRequestsMockHelpers } = mockEnvironment);
    // testIndexName is configured in initialEntries of the memory router
    httpRequestsMockHelpers.setLoadIndexDetailsResponse(testIndexName, testIndexMock);

    await act(async () => {
      testBed = await setup({
        httpSetup,
        dependencies: {
          url: {
            locators: {
              get: () => ({ navigate: jest.fn() }),
            },
          },
        },
      });
    });
    testBed.component.update();
  });

  it('shows index name in header', () => {
    const header = testBed.actions.getHeader();
    expect(header).toEqual(testIndexName);
  });
  it('back to indices list button exists', () => {
    expect(testBed.actions.isBackToIndicesListButtonExists()).toBe(true);
  });
  describe('more options ', () => {
    beforeEach(async () => {
      await testBed.actions.moreOptionsContextMenu.clickMoreOptionsButton();
    });
    it('shows more options', async () => {
      testBed.actions.moreOptionsContextMenu.confirmMoreOptionsMenuItemsAreVisible();
    });
    it('can delete index', async () => {
      jest.spyOn(testBed.routerMock.history, 'push');
      await testBed.actions.moreOptionsContextMenu.clickDeleteIndexButton();
      testBed.actions.moreOptionsContextMenu.confirmDeleteIndexModalIsVisible();

      await testBed.actions.moreOptionsContextMenu.confirmDeleteIndex();
      expect(httpSetup.post).toHaveBeenCalledWith(`${API_BASE_PATH}/indices/delete`, {
        body: JSON.stringify({ indices: [testIndexName] }),
      });
      expect(testBed.routerMock.history.push).toHaveBeenCalledTimes(1);
      expect(testBed.routerMock.history.push).toHaveBeenCalledWith('/indices');
    });
  });
});
