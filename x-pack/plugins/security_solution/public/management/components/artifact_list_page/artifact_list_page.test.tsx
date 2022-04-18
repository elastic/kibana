/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppContextTestRender } from '../../../common/mock/endpoint';
import { trustedAppsAllHttpMocks } from '../../pages/mocks';
import { ArtifactListPageProps } from './artifact_list_page';
import { act, fireEvent, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  getArtifactListPageRenderingSetup,
  getDeferred,
  ArtifactListPageRenderingSetup,
} from './mocks';

jest.mock('../../../common/components/user_privileges');

describe('When using the ArtifactListPage component', () => {
  let render: (
    props?: Partial<ArtifactListPageProps>
  ) => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let history: AppContextTestRender['history'];
  let mockedApi: ReturnType<typeof trustedAppsAllHttpMocks>;
  let getFirstCard: ArtifactListPageRenderingSetup['getFirstCard'];

  beforeEach(() => {
    const renderSetup = getArtifactListPageRenderingSetup();

    ({ history, mockedApi, getFirstCard } = renderSetup);

    render = (props = {}) => (renderResult = renderSetup.renderArtifactListPage(props));
  });

  it('should display a loader while determining which view to show', async () => {
    // Mock a delay into the list results http call
    const deferrable = getDeferred();
    mockedApi.responseProvider.trustedAppsList.mockDelay.mockReturnValue(deferrable.promise);

    const { getByTestId } = render();
    const loader = getByTestId('testPage-pageLoader');

    expect(loader).not.toBeNull();

    // release the API call
    act(() => {
      deferrable.resolve();
    });

    await waitForElementToBeRemoved(loader);
  });

  describe('and data exists', () => {
    let renderWithListData: () => Promise<ReturnType<typeof render>>;

    beforeEach(async () => {
      renderWithListData = async () => {
        render();

        await act(async () => {
          await waitFor(() => {
            expect(renderResult.getByTestId('testPage-list')).toBeTruthy();
          });
        });

        return renderResult;
      };
    });

    it('should show list data loading indicator while list results are retrieved (and after list was checked to see if it has data)', async () => {
      // add a delay to the list results, but not to the API call
      // that is used to determine if the list contains data
      mockedApi.responseProvider.trustedAppsList.mockDelay.mockImplementation(async (options) => {
        const query = options.query as { page?: number; per_page?: number };
        if (query.page === 1 && query.per_page === 1) {
          return;
        }

        return new Promise((r) => setTimeout(r, 50));
      });

      const { getByTestId } = await renderWithListData();

      expect(getByTestId('testPage-list-loader')).toBeTruthy();
    });

    it(`should show cards with results`, async () => {
      const { findAllByTestId, getByTestId } = await renderWithListData();

      await expect(findAllByTestId('testPage-card')).resolves.toHaveLength(10);
      expect(getByTestId('testPage-showCount').textContent).toBe('Showing 20 artifacts');
    });

    it('should show card actions', async () => {
      const { getByTestId } = await renderWithListData();
      await getFirstCard({ showActions: true });

      expect(getByTestId('testPage-card-cardEditAction')).toBeTruthy();
      expect(getByTestId('testPage-card-cardDeleteAction')).toBeTruthy();
    });

    it('should persist pagination `page` changes to the URL', async () => {
      const { getByTestId } = await renderWithListData();
      act(() => {
        userEvent.click(getByTestId('pagination-button-1'));
      });

      await waitFor(() => {
        expect(history.location.search).toMatch(/page=2/);
      });
    });

    it('should persist pagination `pageSize` changes to the URL', async () => {
      const { getByTestId } = await renderWithListData();
      act(() => {
        userEvent.click(getByTestId('tablePaginationPopoverButton'));
      });
      await act(async () => {
        await waitFor(() => {
          expect(getByTestId('tablePagination-20-rows'));
        });
      });
      act(() => {
        userEvent.click(getByTestId('tablePagination-20-rows'));
      });

      await waitFor(() => {
        expect(history.location.search).toMatch(/pageSize=20/);
      });
    });

    describe('and interacting with card actions', () => {
      const clickCardAction = async (action: 'edit' | 'delete') => {
        await getFirstCard({ showActions: true });
        act(() => {
          switch (action) {
            case 'delete':
              userEvent.click(renderResult.getByTestId('testPage-card-cardDeleteAction'));
              break;

            case 'edit':
              userEvent.click(renderResult.getByTestId('testPage-card-cardEditAction'));
              break;
          }
        });
      };

      it('should display the Edit flyout when edit action is clicked', async () => {
        const { getByTestId } = await renderWithListData();
        await clickCardAction('edit');

        expect(getByTestId('testPage-flyout')).toBeTruthy();
      });

      it('should display the Delete modal when delete action is clicked', async () => {
        const { getByTestId } = await renderWithListData();
        await clickCardAction('delete');

        await waitFor(() => {
          expect(getByTestId('testPage-deleteModal')).toBeTruthy();
        });
      });
    });

    describe('and search bar is used', () => {
      const clickSearchButton = () => {
        act(() => {
          fireEvent.click(renderResult.getByTestId('searchButton'));
        });
      };

      beforeEach(async () => {
        await renderWithListData();
      });

      it('should persist filter to the URL params', async () => {
        act(() => {
          userEvent.type(renderResult.getByTestId('searchField'), 'fooFooFoo');
        });
        clickSearchButton();

        await waitFor(() => {
          expect(history.location.search).toMatch(/fooFooFoo/);
        });

        await waitFor(() => {
          expect(mockedApi.responseProvider.trustedAppsList).toHaveBeenLastCalledWith(
            expect.objectContaining({
              query: expect.objectContaining({
                filter: expect.stringMatching(/\*fooFooFoo\*/),
              }),
            })
          );
        });
      });

      it('should persist policy filter to the URL params', async () => {
        const policyId = mockedApi.responseProvider.endpointPackagePolicyList().items[0].id;
        const firstPolicyTestId = `policiesSelector-popover-items-${policyId}`;

        await act(async () => {
          await waitFor(() => {
            expect(renderResult.getByTestId('policiesSelectorButton')).toBeTruthy();
          });
        });

        act(() => {
          userEvent.click(renderResult.getByTestId('policiesSelectorButton'));
        });

        await act(async () => {
          await waitFor(() => {
            expect(renderResult.getByTestId(firstPolicyTestId)).toBeTruthy();
          });
          userEvent.click(renderResult.getByTestId(firstPolicyTestId));
        });

        await waitFor(() => {
          expect(history.location.search).toMatch(new RegExp(`includedPolicies=${policyId}`));
        });
      });

      it('should trigger a current page data fetch when Refresh button is clicked', async () => {
        const currentApiCount = mockedApi.responseProvider.trustedAppsList.mock.calls.length;

        clickSearchButton();

        await waitFor(() => {
          expect(mockedApi.responseProvider.trustedAppsList).toHaveBeenCalledTimes(
            currentApiCount + 1
          );
        });
      });

      it('should show a no results found message if filter did not return` any results', async () => {
        let apiNoResultsDone = false;
        mockedApi.responseProvider.trustedAppsList.mockImplementationOnce(() => {
          apiNoResultsDone = true;

          return {
            page: 1,
            per_page: 10,
            total: 0,
            data: [],
          };
        });

        act(() => {
          userEvent.type(renderResult.getByTestId('searchField'), 'fooFooFoo');
        });

        clickSearchButton();

        await act(async () => {
          await waitFor(() => {
            expect(apiNoResultsDone).toBe(true);
          });
        });

        await waitFor(() => {
          expect(renderResult.getByTestId('testPage-list-noResults')).toBeTruthy();
        });
      });
    });
  });
});
