/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppContextTestRender, createAppRootMockRenderer } from '../../../../common/mock/endpoint';
import React from 'react';
import { fireEvent, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EventFiltersListPage } from './event_filters_list_page';
import { eventFiltersListQueryHttpMock } from '../test_utils';
import { isFailedResourceState, isLoadedResourceState } from '../../../state';
import { sendGetEndpointSpecificPackagePolicies } from '../../../services/policies/policies';
import { sendGetEndpointSpecificPackagePoliciesMock } from '../../../services/policies/test_mock_utils';

// Needed to mock the data services used by the ExceptionItem component
jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../common/components/user_privileges');
jest.mock('../../../services/policies/policies');

(sendGetEndpointSpecificPackagePolicies as jest.Mock).mockImplementation(
  sendGetEndpointSpecificPackagePoliciesMock
);

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
      history.push('/administration/event_filters');
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

      expect(renderResult.getByTestId('eventFilterListLoader')).toBeTruthy();

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

      [
        ['subHeader-touchedBy-createdBy-value', 'some user'],
        ['subHeader-touchedBy-updatedBy-value', 'some user'],
        ['header-created-value', '4/20/2020'],
        ['header-updated-value', '4/20/2020'],
      ].forEach(([suffix, value]) =>
        expect(renderResult.getByTestId(`eventFilterCard-${suffix}`).textContent).toEqual(value)
      );
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

    it('should show modal when delete is clicked on a card', async () => {
      render();
      await dataReceived();

      await act(async () => {
        (await renderResult.findAllByTestId('eventFilterCard-header-actions-button'))[0].click();
      });

      await act(async () => {
        (await renderResult.findByTestId('deleteEventFilterAction')).click();
      });

      expect(
        renderResult.baseElement.querySelector('[data-test-subj="eventFilterDeleteModalHeader"]')
      ).not.toBeNull();
    });
  });

  describe('And search is dispatched', () => {
    beforeEach(async () => {
      act(() => {
        history.push('/administration/event_filters?filter=test');
      });
      renderResult = render();
      await act(async () => {
        await waitForAction('eventFiltersListPageDataChanged');
      });
    });

    it('search bar is filled with query params', () => {
      expect(renderResult.getByDisplayValue('test')).not.toBeNull();
    });

    it('search action is dispatched', async () => {
      await act(async () => {
        fireEvent.click(renderResult.getByTestId('searchButton'));
        expect(await waitForAction('userChangedUrl')).not.toBeNull();
      });
    });
  });

  describe('And policies select is dispatched', () => {
    it('should apply policy filter', async () => {
      const policies = await sendGetEndpointSpecificPackagePoliciesMock();
      (sendGetEndpointSpecificPackagePolicies as jest.Mock).mockResolvedValue(policies);

      renderResult = render();
      await waitFor(() => {
        expect(sendGetEndpointSpecificPackagePolicies).toHaveBeenCalled();
      });

      const firstPolicy = policies.items[0];

      userEvent.click(renderResult.getByTestId('policiesSelectorButton'));
      userEvent.click(renderResult.getByTestId(`policiesSelector-popover-items-${firstPolicy.id}`));
      await waitFor(() => expect(waitForAction('userChangedUrl')).not.toBeNull());
    });
  });

  describe('and the back button is present', () => {
    beforeEach(async () => {
      renderResult = render();
      act(() => {
        history.push('/administration/event_filters', {
          onBackButtonNavigateTo: [{ appId: 'appId' }],
          backButtonLabel: 'back to fleet',
          backButtonUrl: '/fleet',
        });
      });
    });

    it('back button is present', () => {
      const button = renderResult.queryByTestId('backToOrigin');
      expect(button).not.toBeNull();
      expect(button).toHaveAttribute('href', '/fleet');
    });

    it('back button is still present after push history', () => {
      act(() => {
        history.push('/administration/event_filters');
      });
      const button = renderResult.queryByTestId('backToOrigin');
      expect(button).not.toBeNull();
      expect(button).toHaveAttribute('href', '/fleet');
    });
  });

  describe('and the back button is not present', () => {
    beforeEach(async () => {
      renderResult = render();
      act(() => {
        history.push('/administration/event_filters');
      });
    });

    it('back button is not present when missing history params', () => {
      const button = renderResult.queryByTestId('backToOrigin');
      expect(button).toBeNull();
    });
  });
});
