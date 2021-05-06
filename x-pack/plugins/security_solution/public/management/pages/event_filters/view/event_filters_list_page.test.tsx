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
import { isFailedResourceState, isLoadedResourceState } from '../../../state';

// Needed to mock the data services used by the ExceptionItem component
jest.mock('../../../../common/lib/kibana');

describe('When on the Event Filters List Page', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let history: AppContextTestRender['history'];
  let coreStart: AppContextTestRender['coreStart'];
  let waitForAction: AppContextTestRender['middlewareSpy']['waitForAction'];
  let mockedApi: ReturnType<typeof eventFiltersListQueryHttpMock>;

  const dataReceived = () =>
    act(async () => {
      await waitForAction('eventFiltersListPageDataChanged', {
        validate(action) {
          return isLoadedResourceState(action.payload);
        },
      });
    });

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();

    ({ history, coreStart } = mockedContext);
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
      expect(history.location.search).toEqual('?show=create');
    });
  });

  describe('And data exists', () => {
    it('should show loading indicator while retrieving data', async () => {
      let releaseApiResponse: () => void;

      mockedApi.responseProvider.eventFiltersList.mockDelay.mockReturnValue(
        new Promise((r) => (releaseApiResponse = r))
      );
      render();

      expect(renderResult.getByTestId('eventFiltersContent-loader')).toBeTruthy();

      const wasReceived = dataReceived();
      releaseApiResponse!();
      await wasReceived;

      expect(renderResult.container.querySelector('.euiProgress')).toBeNull();
    });

    it('should show items on the list', async () => {
      render();
      await dataReceived();

      expect(renderResult.getByTestId('eventFilterCard')).toBeTruthy();
    });

    it('should render expected fields on card', async () => {
      render();
      await dataReceived();

      // Take a snapshot of the card to ensure that all of the optional fields we need
      // for Event filters use case (modified info ++ name) are displayed as we expect it.
      expect(renderResult.getByTestId('eventFilterCard')).toMatchSnapshot();
    });

    it('should show API error if one is encountered', async () => {
      mockedApi.responseProvider.eventFiltersList.mockImplementation(() => {
        throw new Error('oh no');
      });
      render();
      await act(async () => {
        await waitForAction('eventFiltersListPageDataChanged', {
          validate(action) {
            return isFailedResourceState(action.payload);
          },
        });
      });

      expect(renderResult.getByTestId('eventFiltersContent-error').textContent).toEqual(' oh no');
    });
  });
});
