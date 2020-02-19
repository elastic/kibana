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
import { EndpointAppLocation } from '../../types';
import { fireEvent } from '@testing-library/react';
jest.mock('react-router-dom', () => {
  const history = {
    push: jest.fn(),
  };
  return {
    ...jest.requireActual('react-router-dom'),
    useHistory: () => history,
  };
});
import { useHistory } from 'react-router-dom';

function testSubjSelector(testSubjectID: string): string {
  return `[data-test-subj="${testSubjectID}"]`;
}

describe('when on the alerting page', () => {
  let render: () => reactTestingLibrary.RenderResult;
  let store: ReturnType<typeof appStoreFactory>;
  beforeEach(async () => {
    store = appStoreFactory(coreMock.createStart(), true);
    render = () => {
      return reactTestingLibrary.render(
        <Provider store={store}>
          <I18nProvider>
            <AlertIndex />
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
        const payload: EndpointAppLocation = {
          pathname: '',
          search: '?selected_alert=1',
          hash: '',
        };
        store.dispatch({ type: 'userChangedUrl', payload });
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
      it('should push a new URL without the selected alert', () => {
        expect(useHistory().push).toHaveBeenCalledTimes(1);
        expect(useHistory().push).toHaveBeenLastCalledWith('?');
      });
    });
  });
});
