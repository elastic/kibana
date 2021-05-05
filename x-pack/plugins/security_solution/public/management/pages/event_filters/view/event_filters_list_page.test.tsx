/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppContextTestRender, createAppRootMockRenderer } from '../../../../common/mock/endpoint';
import React from 'react';
import { fireEvent, act } from '@testing-library/react';
import { EventFiltersListPage } from './event_filters_list_page';
import { eventFiltersListQueryHttpMock } from '../test_utils';
import { isLoadedResourceState } from '../../../state';

describe('When on the Event Filters Page', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let history: AppContextTestRender['history'];
  let store: AppContextTestRender['store'];
  let coreStart: AppContextTestRender['coreStart'];
  let waitForAction: AppContextTestRender['middlewareSpy']['waitForAction'];
  let mockedApi: ReturnType<typeof eventFiltersListQueryHttpMock>;

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();
    ({ history, store, coreStart } = mockedContext);
    render = () => (renderResult = mockedContext.render(<EventFiltersListPage />));
    mockedApi = eventFiltersListQueryHttpMock(coreStart.http);
    waitForAction = mockedContext.middlewareSpy.waitForAction;
    act(() => {
      mockedContext.setExperimentalFlag({ eventFilteringEnabled: true });
      history.push('/event_filters');
    });
  });

  describe('And no data exists', () => {
    beforeEach(async () => {
      mockedApi.responseProvider.eventFiltersList.mockReturnValue({
        data: [],
        page: 1,
        per_page: 10,
        total: 0,
      });

      render();

      await act(async () => {
        await waitForAction('eventFiltersListPageDataExistsChanged', {
          validate(action) {
            return isLoadedResourceState(action.payload);
          },
        });
      });
    });

    it('should show the Empty message', () => {
      expect(renderResult.getByTestId('eventFiltersEmpty')).toBeTruthy();
      expect(renderResult.getByTestId('eventFiltersListEmptyStateAddButton')).toBeTruthy();
    });

    it('should open create flyout when add button in empty state is clicked', async () => {
      act(() => {
        fireEvent.click(renderResult.getByTestId('eventFiltersListEmptyStateAddButton'));
      });
      expect(renderResult.getByTestId('eventFiltersCreateEditFlyout')).toBeTruthy();
    });
  });

  describe('And data exists', () => {
    it.todo('should show loading indicator while retrieving data');

    it.todo('should show items on the list');

    it.todo('should render expected fields on card');

    it.todo('should show API error if one is encountered');
  });
});
