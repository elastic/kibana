/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as reactTestingLibrary from '@testing-library/react';
import { appStoreFactory } from '../../store';
import { fireEvent } from '@testing-library/react';
import { MemoryHistory } from 'history';
import { AppAction } from '../../types';
import { mockAlertDetailsResult } from '../../store/alerts/mock_alert_result_list';
import { alertPageTestRender } from './test_helpers/render_alert_page';

describe('when the alert details flyout is open', () => {
  let render: () => reactTestingLibrary.RenderResult;
  let history: MemoryHistory<never>;
  let store: ReturnType<typeof appStoreFactory>;

  beforeEach(async () => {
    // Creates the render elements for the tests to use
    ({ render, history, store } = alertPageTestRender);
  });
  describe('when the alerts details flyout is open', () => {
    beforeEach(() => {
      reactTestingLibrary.act(() => {
        history.push({
          search: '?selected_alert=1',
        });
      });
    });
    describe('when the data loads', () => {
      beforeEach(() => {
        reactTestingLibrary.act(() => {
          const action: AppAction = {
            type: 'serverReturnedAlertDetailsData',
            payload: mockAlertDetailsResult(),
          };
          store.dispatch(action);
        });
      });
      it('should display take action button', async () => {
        await render().findByTestId('alertDetailTakeActionDropdownButton');
      });
      describe('when the user clicks the take action button on the flyout', () => {
        let renderResult: reactTestingLibrary.RenderResult;
        beforeEach(async () => {
          renderResult = render();
          const takeActionButton = await renderResult.findByTestId(
            'alertDetailTakeActionDropdownButton'
          );
          if (takeActionButton) {
            fireEvent.click(takeActionButton);
          }
        });
        it('should display the correct fields in the dropdown', async () => {
          await renderResult.findByTestId('alertDetailTakeActionCloseAlertButton');
          await renderResult.findByTestId('alertDetailTakeActionWhitelistButton');
        });
      });
      describe('when the user navigates to the overview tab', () => {
        let renderResult: reactTestingLibrary.RenderResult;
        beforeEach(async () => {
          renderResult = render();
          const overviewTab = await renderResult.findByTestId('overviewMetadata');
          if (overviewTab) {
            fireEvent.click(overviewTab);
          }
        });
        it('should render all accordion panels', async () => {
          await renderResult.findAllByTestId('alertDetailsAlertAccordion');
          await renderResult.findAllByTestId('alertDetailsHostAccordion');
          await renderResult.findAllByTestId('alertDetailsFileAccordion');
          await renderResult.findAllByTestId('alertDetailsHashAccordion');
          await renderResult.findAllByTestId('alertDetailsSourceProcessAccordion');
          await renderResult.findAllByTestId('alertDetailsSourceProcessTokenAccordion');
        });
      });
    });
  });
});
