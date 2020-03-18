/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import * as reactTestingLibrary from '@testing-library/react';
import { Provider } from 'react-redux';
import { I18nProvider } from '@kbn/i18n/react';
import { EuiThemeProvider } from '../../../../../../../legacy/common/eui_styled_components';
import { appStoreFactory } from '../../store';
import { RouteCapture } from '../route_capture';
import { createMemoryHistory, MemoryHistory } from 'history';
import { Router } from 'react-router-dom';
import { AppAction } from '../../types';
import { HostList } from './index';
import { mockHostResultList } from '../../store/hosts/mock_host_result_list';

describe('when on the hosts page', () => {
  let render: () => reactTestingLibrary.RenderResult;
  let history: MemoryHistory<never>;
  let store: ReturnType<typeof appStoreFactory>;

  beforeEach(async () => {
    history = createMemoryHistory<never>();
    store = appStoreFactory();
    render = () => {
      return reactTestingLibrary.render(
        <Provider store={store}>
          <I18nProvider>
            <EuiThemeProvider>
              <Router history={history}>
                <RouteCapture>
                  <HostList />
                </RouteCapture>
              </Router>
            </EuiThemeProvider>
          </I18nProvider>
        </Provider>
      );
    };
  });

  it('should show a table', async () => {
    const renderResult = render();
    const table = await renderResult.findByTestId('hostListTable');
    expect(table).not.toBeNull();
  });

  describe('when there is no selected host in the url', () => {
    it('should not show the flyout', () => {
      const renderResult = render();
      expect.assertions(1);
      return renderResult.findByTestId('hostDetailsFlyout').catch(e => {
        expect(e).not.toBeNull();
      });
    });
    describe('when data loads', () => {
      beforeEach(() => {
        reactTestingLibrary.act(() => {
          const action: AppAction = {
            type: 'serverReturnedHostList',
            payload: mockHostResultList(),
          };
          store.dispatch(action);
        });
      });

      it('should render the host summary row in the table', async () => {
        const renderResult = render();
        const rows = await renderResult.findAllByRole('row');
        expect(rows).toHaveLength(2);
      });

      describe('when the user clicks the hostname in the table', () => {
        let renderResult: reactTestingLibrary.RenderResult;
        beforeEach(async () => {
          renderResult = render();
          const detailsLink = await renderResult.findByTestId('hostnameCellLink');
          if (detailsLink) {
            reactTestingLibrary.fireEvent.click(detailsLink);
          }
        });

        it('should show the flyout', () => {
          return renderResult.findByTestId('hostDetailsFlyout').then(flyout => {
            expect(flyout).not.toBeNull();
          });
        });
      });
    });
  });

  describe('when there is a selected host in the url', () => {
    beforeEach(() => {
      reactTestingLibrary.act(() => {
        history.push({
          ...history.location,
          search: '?selected_host=1',
        });
      });
    });
    it('should show the flyout', () => {
      const renderResult = render();
      return renderResult.findByTestId('hostDetailsFlyout').then(flyout => {
        expect(flyout).not.toBeNull();
      });
    });
  });
});
