/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppContextTestRender, createAppRootMockRenderer } from '../../../common/mock/endpoint';
import React from 'react';
import { trustedAppsAllHttpMocks } from '../../pages/mocks';
import { ArtifactListPage, ArtifactListPageProps } from './artifact_list_page';
import { TrustedAppsApiClient } from '../../pages/trusted_apps/service/trusted_apps_api_client';
import { artifactListPageLabels } from './translations';
import { act, fireEvent, waitFor, waitForElementToBeRemoved, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ArtifactFormComponentProps } from './types';
import type { HttpFetchOptionsWithPath } from 'kibana/public';
import { ExceptionsListItemGenerator } from '../../../../common/endpoint/data_generators/exceptions_list_item_generator';
import { BY_POLICY_ARTIFACT_TAG_PREFIX } from '../../../../common/endpoint/service/artifacts';
import { useUserPrivileges as _useUserPrivileges } from '../../../common/components/user_privileges';
import { getEndpointPrivilegesInitialStateMock } from '../../../common/components/user_privileges/endpoint/mocks';

jest.mock('../../../common/components/user_privileges');
const useUserPrivileges = _useUserPrivileges as jest.Mock;

describe('When using the ArtifactListPage component', () => {
  let render: (
    props?: Partial<ArtifactListPageProps>
  ) => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let history: AppContextTestRender['history'];
  let coreStart: AppContextTestRender['coreStart'];
  let mockedApi: ReturnType<typeof trustedAppsAllHttpMocks>;
  let FormComponentMock: jest.Mock<React.FunctionComponent<ArtifactFormComponentProps>>;

  interface DeferredInterface<T = void> {
    promise: Promise<T>;
    resolve: (data: T) => void;
    reject: (e: Error) => void;
  }

  const getDeferred = function <T = void>(): DeferredInterface<T> {
    let resolve: DeferredInterface<T>['resolve'];
    let reject: DeferredInterface<T>['reject'];

    const promise = new Promise<T>((_resolve, _reject) => {
      resolve = _resolve;
      reject = _reject;
    });

    // @ts-ignore
    return { promise, resolve, reject };
  };

  /**
   * Returns the props object that the Form component was last called with
   */
  const getLastFormComponentProps = (): ArtifactFormComponentProps => {
    return FormComponentMock.mock.calls[FormComponentMock.mock.calls.length - 1][0];
  };

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();

    ({ history, coreStart } = mockedContext);
    mockedApi = trustedAppsAllHttpMocks(coreStart.http);

    const apiClient = new TrustedAppsApiClient(coreStart.http);
    const labels = { ...artifactListPageLabels };

    FormComponentMock = jest.fn((({ mode, error, disabled }: ArtifactFormComponentProps) => {
      return (
        <div data-test-subj="formMock">
          <div>{`${mode} form`}</div>
          <div>{`Is Disabled: ${disabled}`}</div>
          {error && (
            <>
              <div data-test-subj="formError">{error.message}</div>
              <div>{JSON.stringify(error.body)}</div>
            </>
          )}
        </div>
      );
    }) as unknown as jest.Mock<React.FunctionComponent<ArtifactFormComponentProps>>);

    render = (props: Partial<ArtifactListPageProps> = {}) => {
      return (renderResult = mockedContext.render(
        <ArtifactListPage
          apiClient={apiClient}
          ArtifactFormComponent={
            FormComponentMock as unknown as ArtifactListPageProps['ArtifactFormComponent']
          }
          labels={labels}
          data-test-subj="testPage"
          {...props}
        />
      ));
    };
  });

  afterEach(() => {
    useUserPrivileges.mockClear();
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

  describe('and NO data exists', () => {
    beforeEach(() => {
      mockedApi.responseProvider.trustedAppsList.mockReturnValue({
        data: [],
        page: 1,
        per_page: 10,
        total: 0,
      });

      render();
    });

    it('should display empty state', async () => {
      await waitFor(async () => {
        expect(renderResult.getByTestId('testPage-emptyState'));
      });
    });

    it('should hide page headers', async () => {
      expect(renderResult.queryByTestId('header-page-title')).toBe(null);
    });

    it('should open create flyout when primary button is clicked', async () => {
      const addButton = await renderResult.findByTestId('testPage-emptyState-addButton');

      act(() => {
        userEvent.click(addButton);
      });

      expect(renderResult.getByTestId('testPage-flyout')).toBeTruthy();
      expect(history.location.search).toMatch(/show=create/);
    });
  });

  describe('and the flyout is opened', () => {
    let renderAndWaitForFlyout: (
      props?: Partial<ArtifactListPageProps>
    ) => Promise<ReturnType<typeof render>>;

    beforeEach(async () => {
      history.push('somepage?show=create');

      renderAndWaitForFlyout = async (...props) => {
        render(...props);

        await waitFor(async () => {
          expect(renderResult.getByTestId('testPage-flyout'));
        });

        return renderResult;
      };
    });

    it('should display `Cancel` button enabled', async () => {
      await renderAndWaitForFlyout();

      expect(
        (renderResult.getByTestId('testPage-flyout-cancelButton') as HTMLButtonElement).disabled
      ).toBe(false);
    });

    it('should display `Submit` button as disabled', async () => {
      await renderAndWaitForFlyout();

      expect(
        (renderResult.getByTestId('testPage-flyout-submitButton') as HTMLButtonElement).disabled
      ).toBe(true);
    });

    it.each([
      ['Cancel', 'testPage-flyout-cancelButton'],
      ['Close', 'euiFlyoutCloseButton'],
    ])('should close flyout when `%s` button is clicked', async (_, testId) => {
      await renderAndWaitForFlyout();

      act(() => {
        userEvent.click(renderResult.getByTestId(testId));
      });

      expect(renderResult.queryByTestId('testPage-flyout')).toBeNull();
      expect(history.location.search).toEqual('');
    });

    it('should pass to the Form component the expected props', async () => {
      await renderAndWaitForFlyout();

      expect(FormComponentMock).toHaveBeenLastCalledWith(
        {
          disabled: false,
          error: undefined,
          item: {
            comments: [],
            description: '',
            entries: [],
            item_id: undefined,
            list_id: 'endpoint_trusted_apps',
            meta: expect.any(Object),
            name: '',
            namespace_type: 'agnostic',
            os_types: ['windows'],
            tags: ['policy:all'],
            type: 'simple',
          },
          mode: 'create',
          onChange: expect.any(Function),
        },
        expect.anything()
      );
    });

    describe('and form data is valid', () => {
      beforeEach(async () => {
        const _renderAndWaitForFlyout = renderAndWaitForFlyout;

        // Override renderAndWaitForFlyout to also set the form data as "valid"
        renderAndWaitForFlyout = async (...props) => {
          await _renderAndWaitForFlyout(...props);

          act(() => {
            const lastProps = getLastFormComponentProps();
            lastProps.onChange({ item: { ...lastProps.item, name: 'some name' }, isValid: true });
          });

          return renderResult;
        };
      });

      it('should enable the `Submit` button', async () => {
        await renderAndWaitForFlyout();

        expect(
          (renderResult.getByTestId('testPage-flyout-submitButton') as HTMLButtonElement).disabled
        ).toBe(false);
      });

      describe('and user clicks submit', () => {
        let releaseApiUpdateResponse: () => void;
        let getByTestId: typeof renderResult['getByTestId'];

        beforeEach(async () => {
          await renderAndWaitForFlyout();

          getByTestId = renderResult.getByTestId;

          // Mock a delay into the create api http call
          const deferrable = getDeferred();
          mockedApi.responseProvider.trustedAppCreate.mockDelay.mockReturnValue(deferrable.promise);
          releaseApiUpdateResponse = deferrable.resolve;

          act(() => {
            userEvent.click(renderResult.getByTestId('testPage-flyout-submitButton'));
          });
        });

        afterEach(() => {
          if (releaseApiUpdateResponse) {
            releaseApiUpdateResponse();
          }
        });

        it('should disable all buttons while an update is in flight', () => {
          expect((getByTestId('testPage-flyout-cancelButton') as HTMLButtonElement).disabled).toBe(
            true
          );
          expect((getByTestId('testPage-flyout-submitButton') as HTMLButtonElement).disabled).toBe(
            true
          );
        });

        it('should display loading indicator on Submit while an update is in flight', () => {
          expect(
            getByTestId('testPage-flyout-submitButton').querySelector('.euiLoadingSpinner')
          ).toBeTruthy();
        });

        it('should pass `disabled=true` to the Form component while an update is in flight', () => {
          expect(getLastFormComponentProps().disabled).toBe(true);
        });
      });

      describe('and submit is successful', () => {
        beforeEach(async () => {
          await renderAndWaitForFlyout();

          act(() => {
            userEvent.click(renderResult.getByTestId('testPage-flyout-submitButton'));
          });

          await act(async () => {
            await waitFor(() => {
              expect(renderResult.queryByTestId('testPage-flyout')).toBeNull();
            });
          });
        });

        it('should show a success toast', async () => {
          expect(coreStart.notifications.toasts.addSuccess).toHaveBeenCalledWith(
            '"some name" has been added.'
          );
        });

        it('should clear the URL params', () => {
          expect(location.search).toBe('');
        });
      });

      describe('and submit fails', () => {
        beforeEach(async () => {
          const _renderAndWaitForFlyout = renderAndWaitForFlyout;

          renderAndWaitForFlyout = async (...args) => {
            mockedApi.responseProvider.trustedAppCreate.mockImplementation(() => {
              throw new Error('oh oh. no good!');
            });

            await _renderAndWaitForFlyout(...args);

            act(() => {
              userEvent.click(renderResult.getByTestId('testPage-flyout-submitButton'));
            });

            await act(async () => {
              await waitFor(() =>
                expect(mockedApi.responseProvider.trustedAppCreate).toHaveBeenCalled()
              );
            });

            return renderResult;
          };
        });

        it('should re-enable `Cancel` and `Submit` buttons', async () => {
          await renderAndWaitForFlyout();

          const cancelButtonDisabledState = (
            renderResult.getByTestId('testPage-flyout-cancelButton') as HTMLButtonElement
          ).disabled;

          expect(cancelButtonDisabledState).toBe(false);

          const submitButtonDisabledState = (
            renderResult.getByTestId('testPage-flyout-submitButton') as HTMLButtonElement
          ).disabled;

          expect(submitButtonDisabledState).toBe(false);
        });

        it('should pass error along to the Form component and reset disabled back to `false`', async () => {
          await renderAndWaitForFlyout();
          const lastFormProps = getLastFormComponentProps();

          expect(lastFormProps.error).toBeInstanceOf(Error);
          expect(lastFormProps.disabled).toBe(false);
        });
      });

      describe('and a custom Submit handler is used', () => {
        let handleSubmitCallback: jest.Mock;
        let releaseSuccessSubmit: () => void;
        let releaseFailureSubmit: () => void;

        beforeEach(async () => {
          const deferred = getDeferred();
          releaseSuccessSubmit = () => act(() => deferred.resolve());
          releaseFailureSubmit = () => act(() => deferred.reject(new Error('oh oh. No good')));

          handleSubmitCallback = jest.fn(async (item) => {
            await deferred.promise;

            return new ExceptionsListItemGenerator().generateTrustedApp(item);
          });

          await renderAndWaitForFlyout({ onFormSubmit: handleSubmitCallback });

          act(() => {
            userEvent.click(renderResult.getByTestId('testPage-flyout-submitButton'));
          });
        });

        afterEach(() => {
          if (releaseSuccessSubmit) {
            releaseSuccessSubmit();
          }
        });

        it('should use custom submit handler when submit button is used', async () => {
          expect(handleSubmitCallback).toHaveBeenCalled();

          expect(
            (renderResult.getByTestId('testPage-flyout-cancelButton') as HTMLButtonElement).disabled
          ).toBe(true);

          expect(
            (renderResult.getByTestId('testPage-flyout-submitButton') as HTMLButtonElement).disabled
          ).toBe(true);
        });

        it('should catch and show error if one is encountered', async () => {
          releaseFailureSubmit();
          await waitFor(() => {
            expect(renderResult.getByTestId('formError')).toBeTruthy();
          });
        });

        it('should show a success toast', async () => {
          releaseSuccessSubmit();

          await waitFor(() => {
            expect(coreStart.notifications.toasts.addSuccess).toHaveBeenCalled();
          });

          expect(coreStart.notifications.toasts.addSuccess).toHaveBeenCalledWith(
            '"some name" has been added.'
          );
        });

        it('should clear the URL params', () => {
          releaseSuccessSubmit();

          expect(location.search).toBe('');
        });
      });
    });

    describe('and in Edit mode', () => {
      beforeEach(async () => {
        history.push('somepage?show=edit&itemId=123');
      });

      it('should show loader while initializing in edit mode', async () => {
        const deferred = getDeferred();
        mockedApi.responseProvider.trustedApp.mockDelay.mockReturnValue(deferred.promise);

        const { getByTestId } = await renderAndWaitForFlyout();

        // The loader should be shown and the flyout footer should not be shown
        expect(getByTestId('testPage-flyout-loader')).toBeTruthy();
        expect(() => getByTestId('testPage-flyout-cancelButton')).toThrow();
        expect(() => getByTestId('testPage-flyout-submitButton')).toThrow();

        // The Form should not yet have been rendered
        expect(FormComponentMock).not.toHaveBeenCalled();

        act(() => deferred.resolve());

        // we should call the GET API with the id provided
        await waitFor(() => {
          expect(mockedApi.responseProvider.trustedApp).toHaveBeenLastCalledWith(
            expect.objectContaining({
              path: expect.any(String),
              query: expect.objectContaining({
                item_id: '123',
              }),
            })
          );
        });
      });

      it('should provide Form component with the item for edit', async () => {
        const { getByTestId } = await renderAndWaitForFlyout();

        await act(async () => {
          await waitFor(() => {
            expect(getByTestId('formMock')).toBeTruthy();
          });
        });

        expect(getLastFormComponentProps().item).toEqual({
          ...mockedApi.responseProvider.trustedApp({
            query: { item_id: '123' },
          } as unknown as HttpFetchOptionsWithPath),
          created_at: expect.any(String),
        });
      });

      it('should show error toast and close flyout if item for edit does not exist', async () => {
        mockedApi.responseProvider.trustedApp.mockImplementation(() => {
          throw new Error('does not exist');
        });

        await renderAndWaitForFlyout();

        await act(async () => {
          await waitFor(() => {
            expect(mockedApi.responseProvider.trustedApp).toHaveBeenCalled();
          });
        });

        expect(coreStart.notifications.toasts.addWarning).toHaveBeenCalledWith(
          'Failed to retrieve item for edit. Reason: does not exist'
        );
      });

      it('should not show the expired license callout', async () => {
        const { queryByTestId, getByTestId } = await renderAndWaitForFlyout();

        await act(async () => {
          await waitFor(() => {
            expect(getByTestId('formMock')).toBeTruthy();
          });
        });

        expect(queryByTestId('testPage-flyout-expiredLicenseCallout')).not.toBeTruthy();
      });

      it('should show expired license warning when unsupported features are being used (downgrade scenario)', async () => {
        // make the API return a policy specific item
        const _generateResponse = mockedApi.responseProvider.trustedApp.getMockImplementation()!;
        mockedApi.responseProvider.trustedApp.mockImplementation((params) => {
          return {
            ..._generateResponse(params),
            tags: [`${BY_POLICY_ARTIFACT_TAG_PREFIX}${123}`],
          };
        });

        useUserPrivileges.mockReturnValue({
          endpointPrivileges: getEndpointPrivilegesInitialStateMock({
            canCreateArtifactsByPolicy: false,
          }),
        });

        const { getByTestId } = await renderAndWaitForFlyout();

        await act(async () => {
          await waitFor(() => {
            expect(getByTestId('formMock')).toBeTruthy();
          });
        });

        expect(getByTestId('testPage-flyout-expiredLicenseCallout')).toBeTruthy();
      });
    });
  });

  describe('and data exists', () => {
    let renderWithListData: () => Promise<ReturnType<typeof render>>;

    const getFirstCard = async ({
      showActions = false,
    }: Partial<{ showActions: boolean }> = {}): Promise<HTMLElement> => {
      const cards = await renderResult.findAllByTestId('testPage-card');

      if (cards.length === 0) {
        throw new Error('No cards found!');
      }

      const card = cards[0];

      if (showActions) {
        await act(async () => {
          userEvent.click(within(card).getByTestId('testPage-card-header-actions-button'));

          await waitFor(() => {
            expect(renderResult.getByTestId('testPage-card-header-actions-contextMenuPanel'));
          });
        });
      }

      return card;
    };

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

    it('should persist pagination `page size` changes to the URL', async () => {
      const { getByTestId } = await renderWithListData();
      act(() => {
        userEvent.click(getByTestId('tablePaginationPopoverButton'));
      });
      await act(async () => {
        await waitFor(() => {
          expect(getByTestId('tablePagination-20-rows'));
        });
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

        expect(getByTestId('testPage-deleteModal')).toBeTruthy();
      });

      describe('and interacting with the deletion modal', () => {
        let cancelButton: HTMLButtonElement;
        let submitButton: HTMLButtonElement;

        beforeEach(async () => {
          await renderWithListData();
          await clickCardAction('delete');

          cancelButton = renderResult.getByTestId(
            'testPage-deleteModal-cancelButton'
          ) as HTMLButtonElement;
          submitButton = renderResult.getByTestId(
            'testPage-deleteModal-submitButton'
          ) as HTMLButtonElement;
        });

        it('should show Cancel and Delete buttons enabled', async () => {
          expect(cancelButton.disabled).toBe(false);
          expect(submitButton.disabled).toBe(false);
        });

        it('should close modal if Cancel/Close buttons are clicked', async () => {
          userEvent.click(cancelButton);

          expect(renderResult.queryByTestId('testPage-deleteModal')).toBeNull();
        });

        it('should prevent modal from being closed while deletion is in flight', async () => {
          const deferred = getDeferred();
          mockedApi.responseProvider.trustedAppDelete.mockDelay.mockReturnValue(deferred.promise);

          act(() => {
            userEvent.click(submitButton);
          });

          await waitFor(() => {
            expect(cancelButton.disabled).toBe(true);
            expect(submitButton.disabled).toBe(true);
          });

          deferred.resolve(); // cleanup
        });

        it('should show success toast if deleted successfully', async () => {
          act(() => {
            userEvent.click(submitButton);
          });

          await act(async () => {
            await waitFor(() => {
              expect(mockedApi.responseProvider.trustedAppDelete).toHaveBeenCalled();
            });
          });

          expect(coreStart.notifications.toasts.addSuccess).toHaveBeenCalledWith(
            expect.stringMatching(/ has been removed$/)
          );
        });

        it('should show error toast if deletion failed', async () => {
          mockedApi.responseProvider.trustedAppDelete.mockImplementation(() => {
            throw new Error('oh oh');
          });

          act(() => {
            userEvent.click(submitButton);
          });

          await act(async () => {
            await waitFor(() => {
              expect(mockedApi.responseProvider.trustedAppDelete).toHaveBeenCalled();
            });
          });

          expect(coreStart.notifications.toasts.addDanger).toHaveBeenCalledWith(
            expect.stringMatching(/^Unable to remove .*\. Reason: oh oh/)
          );
          expect(renderResult.getByTestId('testPage-deleteModal')).toBeTruthy();
          expect(cancelButton.disabled).toBe(true);
          expect(submitButton.disabled).toBe(true);
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
          expect(renderResult.getByTestId('policiesSelectorButton')).toBeTruthy();
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

      it('should show a no results found message if filter did not return any results', async () => {
        mockedApi.responseProvider.trustedAppsList.mockReturnValueOnce({
          page: 1,
          per_page: 10,
          total: 0,
          data: [],
        });

        clickSearchButton();

        await waitFor(() => {
          expect(renderResult.getByTestId('testPage-list-noResults')).toBeTruthy();
        });
      });
    });
  });
});
