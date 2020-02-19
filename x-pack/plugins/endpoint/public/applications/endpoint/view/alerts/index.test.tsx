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
      beforeEach(() => {
        const result = render();
        const closeButton = result.container.querySelector(
          testSubjSelector('euiFlyoutCloseButton')
        );
        if (closeButton) {
          fireEvent.click(closeButton);
        }
      });
      it('should no longer show the flyout', () => {
        expect(
          render().container.querySelector(testSubjSelector('alert-detail-flyout'))
        ).toBeNull();
      });
    });
  });
});
