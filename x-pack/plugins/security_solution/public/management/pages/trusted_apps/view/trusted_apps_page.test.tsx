/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import * as reactTestingLibrary from '@testing-library/react';
import { TrustedAppsPage } from './trusted_apps_page';
import { AppContextTestRender, createAppRootMockRenderer } from '../../../../common/mock/endpoint';
import { fireEvent } from '@testing-library/dom';
import { MiddlewareActionSpyHelper } from '../../../../common/store/test_utils';
import { ConditionEntryField, OperatingSystem } from '@kbn/securitysolution-utils';
import { TrustedApp } from '../../../../../common/endpoint/types';
import { HttpFetchOptions, HttpFetchOptionsWithPath } from 'kibana/public';
import { isFailedResourceState, isLoadedResourceState } from '../state';
import { forceHTMLElementOffsetWidth } from '../../../components/effected_policy_select/test_utils';
import { toUpdateTrustedApp } from '../../../../../common/endpoint/service/trusted_apps/to_update_trusted_app';
import { licenseService } from '../../../../common/hooks/use_license';
import { FoundExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { EXCEPTION_LIST_ITEM_URL } from '@kbn/securitysolution-list-constants';
import { trustedAppsAllHttpMocks } from '../../mocks';
import { waitFor } from '@testing-library/react';

jest.mock('../../../../common/hooks/use_license', () => {
  const licenseServiceInstance = {
    isPlatinumPlus: jest.fn(),
  };
  return {
    licenseService: licenseServiceInstance,
    useLicense: () => {
      return licenseServiceInstance;
    },
  };
});

jest.mock('../../../../common/components/user_privileges/endpoint/use_endpoint_privileges');

describe('When on the Trusted Apps Page', () => {
  const expectedAboutInfo =
    'Add a trusted application to improve performance or alleviate conflicts with other ' +
    'applications running on your hosts.';

  let mockedContext: AppContextTestRender;
  let history: AppContextTestRender['history'];
  let coreStart: AppContextTestRender['coreStart'];
  let waitForAction: MiddlewareActionSpyHelper['waitForAction'];
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let mockedApis: ReturnType<typeof trustedAppsAllHttpMocks>;
  let getFakeTrustedApp = jest.fn();

  const originalScrollTo = window.scrollTo;
  const act = reactTestingLibrary.act;
  const waitForListUI = async (): Promise<void> => {
    await waitFor(() => {
      expect(renderResult.getByTestId('trustedAppsListPageContent')).toBeTruthy();
    });
  };

  beforeAll(() => {
    window.scrollTo = () => {};
  });

  afterAll(() => {
    window.scrollTo = originalScrollTo;
  });

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    getFakeTrustedApp = jest.fn(
      (): TrustedApp => ({
        id: '2d95bec3-b48f-4db7-9622-a2b061cc031d',
        version: 'abc123',
        name: 'Generated Exception (3xnng)',
        os: OperatingSystem.WINDOWS,
        created_at: '2021-01-04T13:55:00.561Z',
        created_by: 'me',
        updated_at: '2021-01-04T13:55:00.561Z',
        updated_by: 'me',
        description: 'created by ExceptionListItemGenerator',
        effectScope: { type: 'global' },
        entries: [
          {
            field: ConditionEntryField.PATH,
            value: 'one/two',
            operator: 'included',
            type: 'match',
          },
        ],
      })
    );

    history = mockedContext.history;
    coreStart = mockedContext.coreStart;
    (licenseService.isPlatinumPlus as jest.Mock).mockReturnValue(true);
    waitForAction = mockedContext.middlewareSpy.waitForAction;
    mockedApis = trustedAppsAllHttpMocks(coreStart.http);
    render = () => (renderResult = mockedContext.render(<TrustedAppsPage />));
    reactTestingLibrary.act(() => {
      history.push('/administration/trusted_apps');
    });
    window.scrollTo = jest.fn();
  });

  afterEach(() => reactTestingLibrary.cleanup());

  describe('and there are trusted app entries', () => {
    const renderWithListData = async () => {
      render();
      await act(async () => {
        await waitForListUI();
      });

      return renderResult;
    };

    it('should display subtitle info about trusted apps', async () => {
      const { getByTestId } = await renderWithListData();
      expect(getByTestId('header-panel-subtitle').textContent).toEqual(expectedAboutInfo);
    });

    it('should display a Add Trusted App button', async () => {
      const { getByTestId } = await renderWithListData();
      const addButton = getByTestId('trustedAppsListAddButton');
      expect(addButton.textContent).toBe('Add trusted application');
    });

    it('should display the searchExceptions', async () => {
      await renderWithListData();
      expect(await renderResult.findByTestId('searchExceptions')).not.toBeNull();
    });

    describe('and the Grid view is being displayed', () => {
      const renderWithListDataAndClickOnEditCard = async () => {
        await renderWithListData();

        await act(async () => {
          // The 3rd Trusted app to be rendered will be a policy specific one
          (await renderResult.findAllByTestId('trustedAppCard-header-actions-button'))[2].click();
        });

        act(() => {
          fireEvent.click(renderResult.getByTestId('editTrustedAppAction'));
        });
      };

      const renderWithListDataAndClickAddButton = async (): Promise<
        ReturnType<AppContextTestRender['render']>
      > => {
        await renderWithListData();

        act(() => {
          const addButton = renderResult.getByTestId('trustedAppsListAddButton');
          fireEvent.click(addButton, { button: 1 });
        });

        // Wait for the policies to be loaded
        await act(async () => {
          await waitForAction('trustedAppsPoliciesStateChanged', {
            validate: (action) => {
              return isLoadedResourceState(action.payload);
            },
          });
        });

        return renderResult;
      };

      describe('the license is downgraded to gold or below and the user is editing a per policy TA', () => {
        beforeEach(async () => {
          (licenseService.isPlatinumPlus as jest.Mock).mockReturnValue(false);

          const originalFakeTrustedAppProvider = getFakeTrustedApp.getMockImplementation();
          getFakeTrustedApp.mockImplementation(() => {
            return {
              ...originalFakeTrustedAppProvider!(),
              effectScope: {
                type: 'policy',
                policies: ['abc123'],
              },
            };
          });
          await renderWithListDataAndClickOnEditCard();
        });

        it('shows a message at the top of the flyout to inform the user their license is expired', () => {
          expect(
            renderResult.queryByTestId('addTrustedAppFlyout-expired-license-callout')
          ).toBeTruthy();
        });
      });

      describe('the license is downgraded to gold or below and the user is adding a new TA', () => {
        beforeEach(async () => {
          (licenseService.isPlatinumPlus as jest.Mock).mockReturnValue(false);

          const originalFakeTrustedAppProvider = getFakeTrustedApp.getMockImplementation();
          getFakeTrustedApp.mockImplementation(() => {
            return {
              ...originalFakeTrustedAppProvider!(),
              effectScope: {
                type: 'policy',
                policies: ['abc123'],
              },
            };
          });
          await renderWithListDataAndClickAddButton();
        });
        it('does not show the expired license message at the top of the flyout', async () => {
          expect(
            renderResult.queryByTestId('addTrustedAppFlyout-expired-license-callout')
          ).toBeNull();
        });
      });

      describe('and the edit trusted app button is clicked', () => {
        beforeEach(async () => {
          await renderWithListDataAndClickOnEditCard();
        });

        it('should persist edit params to url', () => {
          expect(history.location.search).toEqual(
            '?show=edit&id=bec3b48f-ddb7-4622-a2b0-61cc031d17eb'
          );
        });

        it('should display the Edit flyout', () => {
          expect(renderResult.getByTestId('addTrustedAppFlyout'));
        });

        it('should NOT display the about info for trusted apps', () => {
          expect(renderResult.queryByTestId('addTrustedAppFlyout-about')).toBeNull();
        });

        it('should show correct flyout title', () => {
          expect(renderResult.getByTestId('addTrustedAppFlyout-headerTitle').textContent).toBe(
            'Edit trusted application'
          );
        });

        it('should display the expected text for the Save button', () => {
          expect(renderResult.getByTestId('addTrustedAppFlyout-createButton').textContent).toEqual(
            'Save'
          );
        });

        it('should display trusted app data for edit', async () => {
          const formNameInput = renderResult.getByTestId(
            'addTrustedAppFlyout-createForm-nameTextField'
          ) as HTMLInputElement;
          const formDescriptionInput = renderResult.getByTestId(
            'addTrustedAppFlyout-createForm-descriptionField'
          ) as HTMLTextAreaElement;

          expect(formNameInput.value).toEqual('Generated Exception (nng74)');
          expect(formDescriptionInput.value).toEqual('created by ExceptionListItemGenerator');
        });

        describe('and when Save is clicked', () => {
          it('should call the correct api (PUT)', async () => {
            await act(async () => {
              fireEvent.click(renderResult.getByTestId('addTrustedAppFlyout-createButton'));
              await waitForAction('trustedAppCreationSubmissionResourceStateChanged', {
                validate({ payload }) {
                  return isLoadedResourceState(payload.newState);
                },
              });
            });

            expect(coreStart.http.put).toHaveBeenCalledTimes(1);

            const lastCallToPut = coreStart.http.put.mock.calls[0] as unknown as [
              string,
              HttpFetchOptions
            ];

            expect(lastCallToPut[0]).toEqual('/api/exception_lists/items');

            expect(JSON.parse(lastCallToPut[1].body as string)).toEqual({
              _version: '9zawi',
              name: 'Generated Exception (nng74)',
              description: 'created by ExceptionListItemGenerator',
              entries: [
                {
                  field: 'process.hash.md5',
                  operator: 'included',
                  type: 'match',
                  value: '741462ab431a22233c787baab9b653c7',
                },
                {
                  field: 'process.executable.caseless',
                  operator: 'included',
                  type: 'match',
                  value: 'c:\\fol\\bin.exe',
                },
              ],
              os_types: ['windows'],
              tags: [
                'policy:ddf6570b-9175-4a6d-b288-61a09771c647',
                'policy:b8e616ae-44fc-4be7-846c-ce8fa5c082dd',
              ],
              id: '05b5e350-0cad-4dc3-a61d-6e6796b0af39',
              comments: [],
              item_id: 'bec3b48f-ddb7-4622-a2b0-61cc031d17eb',
              namespace_type: 'agnostic',
              type: 'simple',
            });
          });
        });
      });

      describe('and attempting to show Edit panel based on URL params', () => {
        const renderAndWaitForGetApi = async () => {
          // the store action watcher is setup prior to render because `renderWithListData()`
          // also awaits API calls and this action could be missed.
          const apiResponseForEditTrustedApp = waitForAction(
            'trustedAppCreationEditItemStateChanged',
            {
              validate({ payload }) {
                return isLoadedResourceState(payload) || isFailedResourceState(payload);
              },
            }
          );

          await renderWithListData();

          await reactTestingLibrary.act(async () => {
            await apiResponseForEditTrustedApp;
          });

          return renderResult;
        };

        beforeEach(() => {
          reactTestingLibrary.act(() => {
            history.push('/administration/trusted_apps?show=edit&id=9999-edit-8888');
          });
        });

        it('should retrieve trusted app via API using url `id`', async () => {
          await renderAndWaitForGetApi();

          expect(coreStart.http.get.mock.calls).toContainEqual([
            EXCEPTION_LIST_ITEM_URL,
            {
              query: {
                item_id: '9999-edit-8888',
                namespace_type: 'agnostic',
              },
            },
          ]);

          expect(
            (
              renderResult.getByTestId(
                'addTrustedAppFlyout-createForm-nameTextField'
              ) as HTMLInputElement
            ).value
          ).toEqual('Generated Exception (u6kh2)');
        });

        it('should redirect to list and show toast message if `id` is missing from URL', async () => {
          reactTestingLibrary.act(() => {
            history.push('/administration/trusted_apps?show=edit&id=');
          });

          await renderAndWaitForGetApi();

          expect(history.location.search).toEqual('');
          expect(coreStart.notifications.toasts.addWarning.mock.calls[0][0]).toEqual(
            'Unable to edit trusted application (No id provided)'
          );
        });

        it('should redirect to list and show toast message on API error for GET of `id`', async () => {
          // Mock the API GET for the trusted application
          mockedApis.responseProvider.trustedApp.mockImplementation(() => {
            throw new Error('test: api error response');
          });

          await renderAndWaitForGetApi();

          expect(history.location.search).toEqual('');
          expect(coreStart.notifications.toasts.addWarning.mock.calls[0][0]).toEqual(
            'Unable to edit trusted application (test: api error response)'
          );
        });
      });
    });
  });

  describe('and the Add Trusted App button is clicked', () => {
    const renderAndClickAddButton = async (): Promise<
      ReturnType<AppContextTestRender['render']>
    > => {
      render();
      await act(async () => {
        await Promise.all([
          waitForAction('trustedAppsListResourceStateChanged'),
          waitForAction('trustedAppsExistStateChanged', {
            validate({ payload }) {
              return isLoadedResourceState(payload);
            },
          }),
        ]);
      });

      act(() => {
        const addButton = renderResult.getByTestId('trustedAppsListAddButton');
        fireEvent.click(addButton, { button: 1 });
      });

      // Wait for the policies to be loaded
      await act(async () => {
        await waitForAction('trustedAppsPoliciesStateChanged', {
          validate: (action) => {
            return isLoadedResourceState(action.payload);
          },
        });
      });

      return renderResult;
    };

    it('should display the create flyout', async () => {
      const { getByTestId } = await renderAndClickAddButton();
      const flyout = getByTestId('addTrustedAppFlyout');
      expect(flyout).not.toBeNull();

      const flyoutTitle = getByTestId('addTrustedAppFlyout-headerTitle');
      expect(flyoutTitle.textContent).toBe('Add trusted application');

      expect(getByTestId('addTrustedAppFlyout-about'));
    });

    it('should update the URL to indicate the flyout is opened', async () => {
      await renderAndClickAddButton();
      expect(/show\=create/.test(history.location.search)).toBe(true);
    });

    it('should preserve other URL search params', async () => {
      const createListResponse =
        mockedApis.responseProvider.trustedAppsList.getMockImplementation()!;
      mockedApis.responseProvider.trustedAppsList.mockImplementation((...args) => {
        const response = createListResponse(...args);
        response.total = 100; // Trigger the UI to show pagination
        return response;
      });

      reactTestingLibrary.act(() => {
        history.push('/administration/trusted_apps?page_index=2&page_size=20');
      });
      await renderAndClickAddButton();
      expect(history.location.search).toBe('?page_index=2&page_size=20&show=create');
    });

    it('should display create form', async () => {
      const { queryByTestId } = await renderAndClickAddButton();
      expect(queryByTestId('addTrustedAppFlyout-createForm')).not.toBeNull();
    });

    it('should have list of policies populated', async () => {
      const resetEnv = forceHTMLElementOffsetWidth();
      await renderAndClickAddButton();
      act(() => {
        fireEvent.click(renderResult.getByTestId('perPolicy'));
      });
      expect(renderResult.getByTestId('policy-ddf6570b-9175-4a6d-b288-61a09771c647'));
      resetEnv();
    });

    it('should initially have the flyout Add button disabled', async () => {
      const { getByTestId } = await renderAndClickAddButton();
      expect((getByTestId('addTrustedAppFlyout-createButton') as HTMLButtonElement).disabled).toBe(
        true
      );
    });

    it('should close flyout if cancel button is clicked', async () => {
      const { getByTestId, queryByTestId } = await renderAndClickAddButton();
      const cancelButton = getByTestId('addTrustedAppFlyout-cancelButton');
      await reactTestingLibrary.act(async () => {
        fireEvent.click(cancelButton, { button: 1 });
        await waitForAction('trustedAppCreationDialogClosed');
      });
      expect(history.location.search).toBe('');
      expect(queryByTestId('addTrustedAppFlyout')).toBeNull();
    });

    it('should close flyout if flyout close button is clicked', async () => {
      const { getByTestId, queryByTestId } = await renderAndClickAddButton();
      const flyoutCloseButton = getByTestId('euiFlyoutCloseButton');
      await reactTestingLibrary.act(async () => {
        fireEvent.click(flyoutCloseButton, { button: 1 });
        await waitForAction('trustedAppCreationDialogClosed');
      });
      expect(queryByTestId('addTrustedAppFlyout')).toBeNull();
      expect(history.location.search).toBe('');
    });

    describe('and when the form data is valid', () => {
      const fillInCreateForm = async () => {
        mockedContext.store.dispatch({
          type: 'trustedAppCreationDialogFormStateUpdated',
          payload: {
            isValid: true,
            entry: toUpdateTrustedApp<TrustedApp>(getFakeTrustedApp()),
          },
        });
      };

      it('should enable the Flyout Add button', async () => {
        await renderAndClickAddButton();
        await fillInCreateForm();

        const flyoutAddButton = renderResult.getByTestId(
          'addTrustedAppFlyout-createButton'
        ) as HTMLButtonElement;

        expect(flyoutAddButton.disabled).toBe(false);
      });

      describe('and the Flyout Add button is clicked', () => {
        let releasePostCreateApi: () => void;

        beforeEach(async () => {
          // Add a delay to the create api response provider and expose a function that allows
          // us to release it at the right time.
          mockedApis.responseProvider.trustedAppCreate.mockDelay.mockReturnValue(
            new Promise((resolve) => {
              releasePostCreateApi = resolve as typeof releasePostCreateApi;
            })
          );

          await renderAndClickAddButton();
          await fillInCreateForm();

          const userClickedSaveActionWatcher = waitForAction('trustedAppCreationDialogConfirmed');
          reactTestingLibrary.act(() => {
            fireEvent.click(renderResult.getByTestId('addTrustedAppFlyout-createButton'), {
              button: 1,
            });
          });

          await reactTestingLibrary.act(async () => {
            await userClickedSaveActionWatcher;
          });
        });

        afterEach(() => releasePostCreateApi());

        it('should display info about Trusted Apps', async () => {
          expect(renderResult.getByTestId('addTrustedAppFlyout-about').textContent).toEqual(
            expectedAboutInfo
          );
        });

        it('should disable the Cancel button', async () => {
          expect(
            (renderResult.getByTestId('addTrustedAppFlyout-cancelButton') as HTMLButtonElement)
              .disabled
          ).toBe(true);
          releasePostCreateApi();
        });

        it('should hide the dialog close button', async () => {
          expect(renderResult.queryByTestId('euiFlyoutCloseButton')).toBeNull();
        });

        it('should disable the flyout Add button and set it to loading', async () => {
          const saveButton = renderResult.getByTestId(
            'addTrustedAppFlyout-createButton'
          ) as HTMLButtonElement;
          expect(saveButton.disabled).toBe(true);
          expect(saveButton.querySelector('.euiLoadingSpinner')).not.toBeNull();
        });

        describe('and if create was successful', () => {
          beforeEach(async () => {
            await reactTestingLibrary.act(async () => {
              const serverResponseAction = waitForAction(
                'trustedAppCreationSubmissionResourceStateChanged'
              );

              coreStart.http.get.mockClear();
              releasePostCreateApi();
              await serverResponseAction;
            });
          });

          it('should close the flyout', () => {
            expect(renderResult.queryByTestId('addTrustedAppFlyout')).toBeNull();
          });

          it('should show success toast notification', () => {
            expect(coreStart.notifications.toasts.addSuccess.mock.calls[0][0]).toEqual({
              text: '"Generated Exception (3xnng)" has been added to the trusted applications list.',
              title: 'Success!',
            });
          });

          it('should trigger the List to reload', () => {
            const isCalled = coreStart.http.get.mock.calls.some(
              (call) => call[0].toString() === `${EXCEPTION_LIST_ITEM_URL}/_find`
            );
            expect(isCalled).toEqual(true);
          });
        });

        describe('and if create failed', () => {
          const ServerErrorResponseBodyMock = class extends Error {
            public readonly body: { message: string };
            constructor(message = 'Test - Bad Call') {
              super(message);
              this.body = {
                message,
              };
            }
          };
          beforeEach(async () => {
            const failedCreateApiResponse = new ServerErrorResponseBodyMock();

            mockedApis.responseProvider.trustedAppCreate.mockImplementation(() => {
              throw failedCreateApiResponse;
            });

            await reactTestingLibrary.act(async () => {
              const serverResponseAction = waitForAction(
                'trustedAppCreationSubmissionResourceStateChanged',
                {
                  validate({ payload }) {
                    return isFailedResourceState(payload.newState);
                  },
                }
              );

              releasePostCreateApi();
              await serverResponseAction;
            });
          });

          it('should continue to show the flyout', () => {
            expect(renderResult.getByTestId('addTrustedAppFlyout')).not.toBeNull();
          });

          it('should enable the Cancel Button', () => {
            expect(
              (renderResult.getByTestId('addTrustedAppFlyout-cancelButton') as HTMLButtonElement)
                .disabled
            ).toBe(false);
          });

          it('should show the dialog close button', () => {
            expect(renderResult.getByTestId('euiFlyoutCloseButton')).not.toBeNull();
          });

          it('should enable the flyout Add button and remove loading indicating', () => {
            expect(
              (renderResult.getByTestId('addTrustedAppFlyout-createButton') as HTMLButtonElement)
                .disabled
            ).toBe(false);
          });

          it('should show API errors in the form', () => {
            expect(renderResult.container.querySelector('.euiForm__errors')).not.toBeNull();
          });
        });
      });
    });

    describe('and when the form data is not valid', () => {
      it('should not enable the Flyout Add button with an invalid hash', async () => {
        await renderAndClickAddButton();
        const { getByTestId } = renderResult;

        reactTestingLibrary.act(() => {
          fireEvent.change(getByTestId('addTrustedAppFlyout-createForm-nameTextField'), {
            target: { value: 'trusted app A' },
          });

          fireEvent.change(
            getByTestId('addTrustedAppFlyout-createForm-conditionsBuilder-group1-entry0-value'),
            { target: { value: 'invalid hash' } }
          );
        });

        const flyoutAddButton = getByTestId(
          'addTrustedAppFlyout-createButton'
        ) as HTMLButtonElement;
        expect(flyoutAddButton.disabled).toBe(true);
      });
    });
  });

  describe('and there are no trusted apps', () => {
    const releaseExistsResponse = jest.fn((): FoundExceptionListItemSchema => {
      return {
        data: [],
        total: 0,
        page: 1,
        per_page: 1,
      };
    });
    const releaseListResponse = jest.fn((): FoundExceptionListItemSchema => {
      return {
        data: [],
        total: 0,
        page: 1,
        per_page: 20,
      };
    });

    beforeEach(() => {
      mockedApis.responseProvider.trustedAppsList.mockImplementation(({ query }) => {
        const { page, per_page: perPage } = query as { page: number; per_page: number };

        if (page === 1 && perPage === 1) {
          return releaseExistsResponse();
        } else {
          return releaseListResponse();
        }
      });
    });

    afterEach(() => {
      releaseExistsResponse.mockClear();
      releaseListResponse.mockClear();
    });

    it('should show a loader until trusted apps existence can be confirmed', async () => {
      render();
      expect(await renderResult.findByTestId('trustedAppsListLoader')).not.toBeNull();
    });

    it('should show Empty Prompt if not entries exist', async () => {
      render();
      await act(async () => {
        await waitForAction('trustedAppsExistStateChanged');
      });
      expect(await renderResult.findByTestId('trustedAppEmptyState')).not.toBeNull();
    });

    it('should hide empty prompt and show list after one trusted app is added', async () => {
      render();
      await act(async () => {
        await waitForAction('trustedAppsExistStateChanged');
      });
      expect(await renderResult.findByTestId('trustedAppEmptyState')).not.toBeNull();
      releaseListResponse.mockReturnValueOnce({
        data: [mockedApis.responseProvider.trustedApp({ query: {} } as HttpFetchOptionsWithPath)],
        total: 1,
        page: 1,
        per_page: 20,
      });
      releaseExistsResponse.mockReturnValueOnce({
        data: [mockedApis.responseProvider.trustedApp({ query: {} } as HttpFetchOptionsWithPath)],
        total: 1,
        page: 1,
        per_page: 1,
      });

      await act(async () => {
        mockedContext.store.dispatch({
          type: 'trustedAppsListDataOutdated',
        });
        await waitForAction('trustedAppsListResourceStateChanged');
      });

      expect(await renderResult.findByTestId('trustedAppsListPageContent')).not.toBeNull();
    });

    it('should should show empty prompt once the last trusted app entry is deleted', async () => {
      releaseListResponse.mockReturnValueOnce({
        data: [mockedApis.responseProvider.trustedApp({ query: {} } as HttpFetchOptionsWithPath)],
        total: 1,
        page: 1,
        per_page: 20,
      });
      releaseExistsResponse.mockReturnValueOnce({
        data: [mockedApis.responseProvider.trustedApp({ query: {} } as HttpFetchOptionsWithPath)],
        total: 1,
        page: 1,
        per_page: 1,
      });

      render();

      await act(async () => {
        await waitForAction('trustedAppsExistStateChanged');
      });

      expect(await renderResult.findByTestId('trustedAppsListPageContent')).not.toBeNull();

      await act(async () => {
        mockedContext.store.dispatch({
          type: 'trustedAppsListDataOutdated',
        });
        await waitForAction('trustedAppsListResourceStateChanged');
      });

      expect(await renderResult.findByTestId('trustedAppEmptyState')).not.toBeNull();
    });

    it('should not display the searchExceptions', async () => {
      render();
      await act(async () => {
        await waitForAction('trustedAppsExistStateChanged');
      });
      expect(renderResult.queryByTestId('searchExceptions')).toBeNull();
    });
  });

  describe('and the search is dispatched', () => {
    beforeEach(async () => {
      reactTestingLibrary.act(() => {
        history.push('/administration/trusted_apps?filter=test');
      });
      render();
      await act(async () => {
        await waitForListUI();
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

  describe('and the back button is present', () => {
    beforeEach(async () => {
      render();
      await act(async () => {
        await waitForListUI();
      });
      reactTestingLibrary.act(() => {
        history.push('/administration/trusted_apps', {
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

    it('back button is present after push history', () => {
      reactTestingLibrary.act(() => {
        history.push('/administration/trusted_apps');
      });
      const button = renderResult.queryByTestId('backToOrigin');
      expect(button).not.toBeNull();
      expect(button).toHaveAttribute('href', '/fleet');
    });
  });

  describe('and the back button is not present', () => {
    beforeEach(async () => {
      render();
      await act(async () => {
        await waitForAction('trustedAppsListResourceStateChanged');
      });
      reactTestingLibrary.act(() => {
        history.push('/administration/trusted_apps');
      });
    });

    it('back button is not present when missing history params', () => {
      const button = renderResult.queryByTestId('backToOrigin');
      expect(button).toBeNull();
    });
  });
});
