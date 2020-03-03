/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import * as reactTestingLibrary from '@testing-library/react';
import { Provider } from 'react-redux';
import { I18nProvider } from '@kbn/i18n/react';
import { AlertIndex } from './index';
import { appStoreFactory } from '../../store';
import { coreMock } from 'src/core/public/mocks';
import { KibanaContextProvider } from '../../../../../../../../src/plugins/kibana_react/public';
import { fireEvent, waitForElement, act } from '@testing-library/react';
import { RouteCapture } from '../route_capture';
import { createMemoryHistory, MemoryHistory } from 'history';
import { Router } from 'react-router-dom';
import { AppAction } from '../../types';
import { mockAlertResultList } from '../../store/alerts/mock_alert_result_list';

describe('when on the alerting page', () => {
  let render: () => reactTestingLibrary.RenderResult;
  let history: MemoryHistory<never>;
  let store: ReturnType<typeof appStoreFactory>;

  /**
   * @testing-library/react provides `queryByTestId`, but that uses the data attribute
   * 'data-testid' whereas our FTR and EUI's tests all use 'data-test-subj'. While @testing-library/react
   * could be configured to use 'data-test-subj', it is not currently configured that way.
   *
   * This provides an equivalent function to `queryByTestId` but that uses our 'data-test-subj' attribute.
   */
  let queryByTestSubjId: (
    renderResult: reactTestingLibrary.RenderResult,
    testSubjId: string
  ) => Promise<Element | null>;

  beforeEach(async () => {
    /**
     * Create a 'history' instance that is only in-memory and causes no side effects to the testing environment.
     */
    history = createMemoryHistory<never>();
    /**
     * Create a store, with the middleware disabled. We don't want side effects being created by our code in this test.
     */
    store = appStoreFactory(coreMock.createStart(), true);

    /**
     * Render the test component, use this after setting up anything in `beforeEach`.
     */
    render = () => {
      /**
       * Provide the store via `Provider`, and i18n APIs via `I18nProvider`.
       * Use react-router via `Router`, passing our in-memory `history` instance.
       * Use `RouteCapture` to emit url-change actions when the URL is changed.
       * Finally, render the `AlertIndex` component which we are testing.
       */
      return reactTestingLibrary.render(
        <Provider store={store}>
          <KibanaContextProvider services={undefined}>
            <I18nProvider>
              <Router history={history}>
                <RouteCapture>
                  <AlertIndex />
                </RouteCapture>
              </Router>
            </I18nProvider>
          </KibanaContextProvider>
        </Provider>
      );
    };
    queryByTestSubjId = async (renderResult, testSubjId) => {
      return await waitForElement(
        /**
         * Use document.body instead of container because EUI renders things like popover out of the DOM heirarchy.
         */
        () => document.body.querySelector(`[data-test-subj="${testSubjId}"]`),
        {
          container: renderResult.container,
        }
      );
    };
  });
  it('should show a data grid', async () => {
    await render().findByTestId('alertListGrid');
  });
  describe('when there is no selected alert in the url', () => {
    it('should not show the flyout', () => {
      expect(render().queryByTestId('alertDetailFlyout')).toBeNull();
    });
    describe('when data loads', () => {
      beforeEach(() => {
        /**
         * Dispatch the `serverReturnedAlertsData` action, which is normally dispatched by the middleware
         * after interacting with the server.
         */
        reactTestingLibrary.act(() => {
          const action: AppAction = {
            type: 'serverReturnedAlertsData',
            payload: mockAlertResultList(),
          };
          store.dispatch(action);
        });
      });
      it('should render the alert summary row in the grid', async () => {
        const renderResult = render();
        const rows = await renderResult.findAllByRole('row');

        /**
         * There should be a 'row' which is the header, and
         * row which is the alert item.
         */
        expect(rows).toHaveLength(2);
      });
      describe('when the user has clicked the alert type in the grid', () => {
        let renderResult: reactTestingLibrary.RenderResult;
        beforeEach(async () => {
          renderResult = render();
          /**
           * This is the cell with the alert type, it has a link.
           */
          fireEvent.click(await renderResult.findByTestId('alertTypeCellLink'));
        });
        it('should show the flyout', async () => {
          await renderResult.findByTestId('alertDetailFlyout');
        });
      });
    });
  });
  describe('when there is a selected alert in the url', () => {
    beforeEach(() => {
      reactTestingLibrary.act(() => {
        history.push({
          ...history.location,
          search: '?selected_alert=1',
        });
      });
    });
    it('should show the flyout', async () => {
      await render().findByTestId('alertDetailFlyout');
    });
    describe('when the user clicks the close button on the flyout', () => {
      let renderResult: reactTestingLibrary.RenderResult;
      beforeEach(async () => {
        renderResult = render();
        /**
         * Use our helper function to find the flyout's close button, as it uses a different test ID attribute.
         */
        const closeButton = await queryByTestSubjId(renderResult, 'euiFlyoutCloseButton');
        if (closeButton) {
          fireEvent.click(closeButton);
        }
      });
      it('should no longer show the flyout', () => {
        expect(render().queryByTestId('alertDetailFlyout')).toBeNull();
      });
    });
  });
  describe('when the url has page_size=1 and a page_index=1', () => {
    beforeEach(() => {
      reactTestingLibrary.act(() => {
        history.push({
          ...history.location,
          search: '?page_size=1&page_index=1',
        });
      });
    });
    describe('when the user changes page size to 10', () => {
      beforeEach(async () => {
        const renderResult = render();
        const paginationButton = await queryByTestSubjId(
          renderResult,
          'tablePaginationPopoverButton'
        );
        if (paginationButton) {
          act(() => {
            fireEvent.click(paginationButton);
          });
        }
        const show10RowsButton = await queryByTestSubjId(renderResult, 'tablePagination-10-rows');
        if (show10RowsButton) {
          act(() => {
            fireEvent.click(show10RowsButton);
          });
        }
      });
      it('should have a page_index of 0', () => {
        expect(history.location.search).toBe('?page_size=10');
      });
    });
  });
});
