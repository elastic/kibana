/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { EVENT_FILTERS_PATH } from '../../../../../../common/constants';
import type { AppContextTestRender } from '../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../common/mock/endpoint';
import { EventFiltersList } from '../event_filters_list';
import { exceptionsListAllHttpMocks } from '../../../../mocks/exceptions_list_http_mocks';
import { SEARCHABLE_FIELDS } from '../../constants';
import { parseQueryFilterToKQL } from '../../../../common/utils';
import type { EndpointPrivileges } from '../../../../../../common/endpoint/types';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';
import { ExceptionsListItemGenerator } from '../../../../../../common/endpoint/data_generators/exceptions_list_item_generator';
import { FILTER_PROCESS_DESCENDANTS_TAG } from '../../../../../../common/endpoint/service/artifacts/constants';

jest.mock('../../../../../common/components/user_privileges');
const mockUserPrivileges = useUserPrivileges as jest.Mock;

describe('When on the Event Filters list page', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let history: AppContextTestRender['history'];
  let mockedContext: AppContextTestRender;
  let apiMocks: ReturnType<typeof exceptionsListAllHttpMocks>;
  let mockedEndpointPrivileges: Partial<EndpointPrivileges>;

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    ({ history } = mockedContext);
    render = () => (renderResult = mockedContext.render(<EventFiltersList />));
    apiMocks = exceptionsListAllHttpMocks(mockedContext.coreStart.http);
    act(() => {
      history.push(EVENT_FILTERS_PATH);
    });

    mockedEndpointPrivileges = { canWriteTrustedApplications: true };
    mockUserPrivileges.mockReturnValue({ endpointPrivileges: mockedEndpointPrivileges });
  });

  afterEach(() => {
    mockUserPrivileges.mockReset();
  });

  it('should search using expected exception item fields', async () => {
    const expectedFilterString = parseQueryFilterToKQL('fooFooFoo', SEARCHABLE_FIELDS);
    const { findAllByTestId } = render();
    await waitFor(async () => {
      await expect(findAllByTestId('EventFiltersListPage-card')).resolves.toHaveLength(10);
    });

    apiMocks.responseProvider.exceptionsFind.mockClear();
    await userEvent.type(renderResult.getByTestId('searchField'), 'fooFooFoo');
    await userEvent.click(renderResult.getByTestId('searchButton'));
    await waitFor(() => {
      expect(apiMocks.responseProvider.exceptionsFind).toHaveBeenCalled();
    });

    expect(apiMocks.responseProvider.exceptionsFind).toHaveBeenLastCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          filter: expectedFilterString,
        }),
      })
    );
  });

  describe('filtering process descendants', () => {
    let renderWithData: () => Promise<ReturnType<AppContextTestRender['render']>>;

    beforeEach(() => {
      renderWithData = async () => {
        const generator = new ExceptionsListItemGenerator();

        apiMocks.responseProvider.exceptionsFind.mockReturnValue({
          data: [
            generator.generateEventFilter(),
            generator.generateEventFilter({ tags: [FILTER_PROCESS_DESCENDANTS_TAG] }),
            generator.generateEventFilter({ tags: [FILTER_PROCESS_DESCENDANTS_TAG] }),
          ],
          total: 3,
          per_page: 3,
          page: 1,
        });

        render();

        await act(async () => {
          await waitFor(() => {
            expect(renderResult.getByTestId('EventFiltersListPage-list')).toBeTruthy();
          });
        });

        return renderResult;
      };
    });

    it('should not show indication if feature flag is disabled', async () => {
      mockedContext.setExperimentalFlag({ filterProcessDescendantsForEventFiltersEnabled: false });

      await renderWithData();

      expect(renderResult.getAllByTestId('EventFiltersListPage-card')).toHaveLength(3);
      expect(
        renderResult.queryAllByTestId(
          'EventFiltersListPage-card-decorator-processDescendantIndication'
        )
      ).toHaveLength(0);
    });

    it('should indicate to user if event filter filters process descendants', async () => {
      mockedContext.setExperimentalFlag({ filterProcessDescendantsForEventFiltersEnabled: true });

      await renderWithData();

      expect(renderResult.getAllByTestId('EventFiltersListPage-card')).toHaveLength(3);
      expect(
        renderResult.getAllByTestId(
          'EventFiltersListPage-card-decorator-processDescendantIndication'
        )
      ).toHaveLength(2);
    });

    it('should display additional `event.category is process` entry in tooltip', async () => {
      mockedContext.setExperimentalFlag({ filterProcessDescendantsForEventFiltersEnabled: true });
      const prefix = 'EventFiltersListPage-card-decorator-processDescendantIndicationTooltip';

      await renderWithData();

      expect(renderResult.getAllByTestId(`${prefix}-tooltipIcon`)).toHaveLength(2);
      expect(renderResult.queryByTestId(`${prefix}-tooltipText`)).not.toBeInTheDocument();

      await userEvent.hover(renderResult.getAllByTestId(`${prefix}-tooltipIcon`)[0]);

      expect(await renderResult.findByTestId(`${prefix}-tooltipText`)).toBeInTheDocument();
      expect(renderResult.getByTestId(`${prefix}-tooltipText`).textContent).toContain(
        'event.category is process'
      );
    });
  });

  describe('RBAC Event Filters', () => {
    describe('ALL privilege', () => {
      beforeEach(() => {
        mockedEndpointPrivileges.canWriteEventFilters = true;
      });

      it('should enable adding entries', async () => {
        render();

        await waitFor(() =>
          expect(renderResult.queryByTestId('EventFiltersListPage-pageAddButton')).toBeTruthy()
        );
      });

      it('should enable modifying/deleting entries', async () => {
        render();

        const actionsButton = await waitFor(
          () => renderResult.getAllByTestId('EventFiltersListPage-card-header-actions-button')[0]
        );
        await userEvent.click(actionsButton);

        expect(renderResult.getByTestId('EventFiltersListPage-card-cardEditAction')).toBeTruthy();
        expect(renderResult.getByTestId('EventFiltersListPage-card-cardDeleteAction')).toBeTruthy();
      });
    });

    describe('READ privilege', () => {
      beforeEach(() => {
        mockedEndpointPrivileges.canWriteEventFilters = false;
      });

      it('should disable adding entries', async () => {
        render();

        await waitFor(() =>
          expect(renderResult.queryByTestId('EventFiltersListPage-container')).toBeTruthy()
        );

        expect(renderResult.queryByTestId('EventFiltersListPage-pageAddButton')).toBeNull();
      });

      it('should disable modifying/deleting entries', async () => {
        render();

        await waitFor(() =>
          expect(renderResult.queryByTestId('EventFiltersListPage-container')).toBeTruthy()
        );

        expect(
          renderResult.queryByTestId('EventFiltersListPage-card-header-actions-button')
        ).toBeNull();
      });
    });
  });
});
