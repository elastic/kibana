/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as reactTestingLibrary from '@testing-library/react';
import { IIndexPattern } from 'src/plugins/data/public';
import { MemoryHistory } from 'history';
import { Store } from 'redux';

import { mockAlertResultList } from '../store/mock_alert_result_list';
import { alertPageTestRender } from './test_helpers/render_alert_page';
import { DepsStartMock } from '../../common/mock/endpoint';
import { State } from '../../common/store/types';
import { AppAction } from '../../common/store/actions';

describe('when on the alerting page', () => {
  let render: () => reactTestingLibrary.RenderResult;
  let history: MemoryHistory<never>;
  let store: Store<State>;
  let depsStart: DepsStartMock;

  beforeEach(async () => {
    // Creates the render elements for the tests to use
    ({ render, history, store, depsStart } = alertPageTestRender());
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
            payload: mockAlertResultList({ total: 11 }),
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
        expect(rows).toHaveLength(11);
      });
      describe('when the user has clicked the alert type in the grid', () => {
        let renderResult: reactTestingLibrary.RenderResult;
        beforeEach(async () => {
          renderResult = render();
          const alertLinks = await renderResult.findAllByTestId('alertTypeCellLink');
          /**
           * This is the cell with the alert type, it has a link.
           */
          reactTestingLibrary.fireEvent.click(alertLinks[0]);
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
        const closeButton = await renderResult.findByTestId('euiFlyoutCloseButton');
        if (closeButton) {
          reactTestingLibrary.fireEvent.click(closeButton);
        }
      });
      it('should no longer show the flyout', () => {
        expect(render().queryByTestId('alertDetailFlyout')).toBeNull();
      });
      it('should no longer track flyout state in url', () => {
        const unexpectedTabString = 'active_details_tab';
        const unexpectedAlertString = 'selected_alert';
        expect(history.location.search).toEqual(expect.not.stringContaining(unexpectedTabString));
        expect(history.location.search).toEqual(expect.not.stringContaining(unexpectedAlertString));
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

      // the test interacts with the pagination elements, which require data to be loaded
      reactTestingLibrary.act(() => {
        const action: AppAction = {
          type: 'serverReturnedAlertsData',
          payload: mockAlertResultList({
            total: 20,
          }),
        };
        store.dispatch(action);
      });
    });
    describe('when the user changes page size to 10', () => {
      beforeEach(async () => {
        const renderResult = render();
        const paginationButton = await renderResult.findByTestId('tablePaginationPopoverButton');
        if (paginationButton) {
          reactTestingLibrary.act(() => {
            reactTestingLibrary.fireEvent.click(paginationButton);
          });
        }
        const show10RowsButton = await renderResult.findByTestId('tablePagination-10-rows');
        if (show10RowsButton) {
          reactTestingLibrary.act(() => {
            reactTestingLibrary.fireEvent.click(show10RowsButton);
          });
        }
      });
      it('should have a page_index of 0', () => {
        expect(history.location.search).toBe('?page_size=10');
      });
    });
  });
  describe('when there are filtering params in the url', () => {
    let indexPatterns: IIndexPattern[];
    beforeEach(() => {
      /**
       * Dispatch the `serverReturnedSearchBarIndexPatterns` action, which is normally dispatched by the middleware
       * when the page loads. The SearchBar will not render if there are no indexPatterns in the state.
       */
      indexPatterns = [
        { title: 'endpoint-events-1', fields: [{ name: 'host.hostname', type: 'string' }] },
      ];
      reactTestingLibrary.act(() => {
        const action: AppAction = {
          type: 'serverReturnedSearchBarIndexPatterns',
          payload: indexPatterns,
        };
        store.dispatch(action);
      });

      const searchBarQueryParam =
        '(language%3Akuery%2Cquery%3A%27host.hostname%20%3A%20"DESKTOP-QBBSCUT"%27)';
      const searchBarDateRangeParam = '(from%3Anow-1y%2Cto%3Anow)';
      reactTestingLibrary.act(() => {
        history.push({
          ...history.location,
          search: `?query=${searchBarQueryParam}&date_range=${searchBarDateRangeParam}`,
        });
      });
    });
    it("should render the SearchBar component with the correct 'indexPatterns' prop", async () => {
      render();
      const callProps = depsStart.data.ui.SearchBar.mock.calls[0][0];
      expect(callProps.indexPatterns).toEqual(indexPatterns);
    });
    it("should render the SearchBar component with the correct 'query' prop", async () => {
      render();
      const callProps = depsStart.data.ui.SearchBar.mock.calls[0][0];
      const expectedProp = { query: 'host.hostname : "DESKTOP-QBBSCUT"', language: 'kuery' };
      expect(callProps.query).toEqual(expectedProp);
    });
    it("should render the SearchBar component with the correct 'dateRangeFrom' prop", async () => {
      render();
      const callProps = depsStart.data.ui.SearchBar.mock.calls[0][0];
      const expectedProp = 'now-1y';
      expect(callProps.dateRangeFrom).toEqual(expectedProp);
    });
    it("should render the SearchBar component with the correct 'dateRangeTo' prop", async () => {
      render();
      const callProps = depsStart.data.ui.SearchBar.mock.calls[0][0];
      const expectedProp = 'now';
      expect(callProps.dateRangeTo).toEqual(expectedProp);
    });
    it('should render the SearchBar component with the correct display props', async () => {
      render();
      const callProps = depsStart.data.ui.SearchBar.mock.calls[0][0];
      expect(callProps.showFilterBar).toBe(true);
      expect(callProps.showDatePicker).toBe(true);
      expect(callProps.showQueryBar).toBe(true);
      expect(callProps.showQueryInput).toBe(true);
      expect(callProps.showSaveQuery).toBe(false);
    });
  });
});
