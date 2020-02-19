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
import { fireEvent } from '@testing-library/react';
import { RouteCapture } from '../route_capture';
import { createMemoryHistory, MemoryHistory } from 'history';
import { Router } from 'react-router-dom';
import { AppAction } from '../../types';
import { mockAlertResultList } from '../../store/alerts/mock_alert_result_list';

function testSubjSelector(testSubjectID: string): string {
  return `[data-test-subj="${testSubjectID}"]`;
}

describe('when on the alerting page', () => {
  let render: () => reactTestingLibrary.RenderResult;
  let history: MemoryHistory<never>;
  let store: ReturnType<typeof appStoreFactory>;
  beforeEach(async () => {
    history = createMemoryHistory<never>();
    store = appStoreFactory(coreMock.createStart(), true);
    render = () => {
      return reactTestingLibrary.render(
        <Provider store={store}>
          <I18nProvider>
            <Router history={history}>
              <RouteCapture>
                <AlertIndex />
              </RouteCapture>
            </Router>
          </I18nProvider>
        </Provider>
      );
    };
  });
  it('should show a data grid', () => {
    expect(render().container.querySelector(testSubjSelector('alertListGrid'))).not.toBeNull();
  });
  describe('when there is no selected alert in the url', () => {
    it('should not show the flyout', async () => {
      expect(render().container.querySelector(testSubjSelector('alert-detail-flyout'))).toBeNull();
    });
    describe('when data loads', () => {
      beforeEach(() => {
        reactTestingLibrary.act(() => {
          const action: AppAction = {
            type: 'serverReturnedAlertsData',
            payload: mockAlertResultList(),
          };
          store.dispatch(action);
        });
      });
      it('should render the alert summary row in the grid', async () => {
        /**
         * There should be a 'row' which is the header, and
         * another 'row' which is the alert summary.
         */
        expect(await render().findAllByRole('row')).toHaveLength(2);
      });
      describe('when the user has clicked the alert type in the grid', () => {
        let renderResult: reactTestingLibrary.RenderResult;
        beforeEach(() => {
          renderResult = render();
          // This is the cell with the alert type, it has a link.
          const alertTypeCellLink = renderResult.container.querySelector(
            testSubjSelector('alert-type-cell-link')
          );
          if (alertTypeCellLink) {
            fireEvent.click(alertTypeCellLink);
          }
        });
        it('should show the flyout', () => {
          expect(
            renderResult.container.querySelector(testSubjSelector('alert-detail-flyout'))
          ).not.toBeNull();
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
    it('should show the flyout', () => {
      expect(
        render().container.querySelector(testSubjSelector('alert-detail-flyout'))
      ).not.toBeNull();
    });
    describe('when the user clicks the close button on the flyout', () => {
      let renderResult: reactTestingLibrary.RenderResult;
      beforeEach(() => {
        renderResult = render();
        const closeButton = renderResult.container.querySelector(
          testSubjSelector('euiFlyoutCloseButton')
        );
        if (closeButton) {
          fireEvent.click(closeButton);
        }
      });
      it('should no longer show the flyout', () => {
        expect(
          renderResult.container.querySelector(testSubjSelector('alert-detail-flyout'))
        ).toBeNull();
      });
    });
  });
});
