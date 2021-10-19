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
import {
  ConditionEntryField,
  GetTrustedAppsListResponse,
  NewTrustedApp,
  OperatingSystem,
  PostTrustedAppCreateResponse,
  TrustedApp,
} from '../../../../../common/endpoint/types';
import { HttpFetchOptions } from 'kibana/public';
import {
  TRUSTED_APPS_GET_API,
  TRUSTED_APPS_LIST_API,
} from '../../../../../common/endpoint/constants';
import {
  GetPackagePoliciesResponse,
  PACKAGE_POLICY_API_ROUTES,
} from '../../../../../../fleet/common';
import { EndpointDocGenerator } from '../../../../../common/endpoint/generate_data';
import { isFailedResourceState, isLoadedResourceState } from '../state';
import { forceHTMLElementOffsetWidth } from './components/effected_policy_select/test_utils';
import { toUpdateTrustedApp } from '../../../../../common/endpoint/service/trusted_apps/to_update_trusted_app';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { resolvePathVariables } from '../../../../common/utils/resolve_path_variables';
import { licenseService } from '../../../../common/hooks/use_license';

// TODO: remove this mock when feature flag is removed
jest.mock('../../../../common/hooks/use_experimental_features');
const useIsExperimentalFeatureEnabledMock = useIsExperimentalFeatureEnabled as jest.Mock;

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

  const generator = new EndpointDocGenerator('policy-list');

  let mockedContext: AppContextTestRender;
  let history: AppContextTestRender['history'];
  let coreStart: AppContextTestRender['coreStart'];
  let waitForAction: MiddlewareActionSpyHelper['waitForAction'];
  let render: () => ReturnType<AppContextTestRender['render']>;
  const originalScrollTo = window.scrollTo;
  const act = reactTestingLibrary.act;

  const getFakeTrustedApp = jest.fn();

  const createListApiResponse = (
    page: number = 1,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    per_page: number = 20
  ): GetTrustedAppsListResponse => {
    return {
      data: [getFakeTrustedApp()],
      total: 50, // << Should be a value large enough to fulfill two pages
      page,
      per_page,
    };
  };

  const mockListApis = (http: AppContextTestRender['coreStart']['http']) => {
    const currentGetHandler = http.get.getMockImplementation();

    http.get.mockImplementation(async (...args) => {
      const path = args[0] as unknown as string;
      // @ts-ignore
      const httpOptions = args[1] as HttpFetchOptions;

      if (path === TRUSTED_APPS_LIST_API) {
        return createListApiResponse(
          Number(httpOptions?.query?.page ?? 1),
          Number(httpOptions?.query?.per_page ?? 20)
        );
      }

      if (path === PACKAGE_POLICY_API_ROUTES.LIST_PATTERN) {
        const policy = generator.generatePolicyPackagePolicy();
        policy.name = 'test policy A';
        policy.id = 'abc123';

        const response: GetPackagePoliciesResponse = {
          items: [policy],
          page: 1,
          perPage: 1000,
          total: 1,
        };
        return response;
      }

      if (currentGetHandler) {
        return currentGetHandler(...args);
      }
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
    getFakeTrustedApp.mockImplementation(
      (): TrustedApp => ({
        id: '1111-2222-3333-4444',
        version: 'abc123',
        name: 'one app',
        os: OperatingSystem.WINDOWS,
        created_at: '2021-01-04T13:55:00.561Z',
        created_by: 'me',
        updated_at: '2021-01-04T13:55:00.561Z',
        updated_by: 'me',
        description: 'a good one',
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
    render = () => mockedContext.render(<TrustedAppsPage />);
    reactTestingLibrary.act(() => {
      history.push('/administration/trusted_apps');
    });
    window.scrollTo = jest.fn();
  });

  afterEach(() => reactTestingLibrary.cleanup());

  describe('and there are trusted app entries', () => {
    const renderWithListData = async () => {
      const renderResult = render();
      await act(async () => {
        await waitForAction('trustedAppsListResourceStateChanged');
      });
      return renderResult;
    };

    beforeEach(() => mockListApis(coreStart.http));

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
      const renderResult = await renderWithListData();
      expect(await renderResult.findByTestId('searchExceptions')).not.toBeNull();
    });

    describe('and the Grid view is being displayed', () => {
      let renderResult: ReturnType<AppContextTestRender['render']>;

      const renderWithListDataAndClickOnEditCard = async () => {
        renderResult = await renderWithListData();

        await act(async () => {
          (await renderResult.findAllByTestId('trustedAppCard-header-actions-button'))[0].click();
        });

        act(() => {
          fireEvent.click(renderResult.getByTestId('editTrustedAppAction'));
        });
      };

      const renderWithListDataAndClickAddButton = async (): Promise<
        ReturnType<AppContextTestRender['render']>
      > => {
        renderResult = await renderWithListData();

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
          useIsExperimentalFeatureEnabledMock.mockReturnValue(true);

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
          useIsExperimentalFeatureEnabledMock.mockReturnValue(true);

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
          expect(history.location.search).toEqual('?show=edit&id=1111-2222-3333-4444');
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

          expect(formNameInput.value).toEqual('one app');
          expect(formDescriptionInput.value).toEqual('a good one');
        });

        describe('and when Save is clicked', () => {
          it('should call the correct api (PUT)', () => {
            act(() => {
              fireEvent.click(renderResult.getByTestId('addTrustedAppFlyout-createButton'));
            });

            expect(coreStart.http.put).toHaveBeenCalledTimes(1);

            const lastCallToPut = coreStart.http.put.mock.calls[0] as unknown as [
              string,
              HttpFetchOptions
            ];

            expect(lastCallToPut[0]).toEqual('/api/endpoint/trusted_apps/1111-2222-3333-4444');
            expect(JSON.parse(lastCallToPut[1].body as string)).toEqual({
              name: 'one app',
              os: 'windows',
              entries: [
                {
                  field: 'process.executable.caseless',
                  value: 'one/two',
                  operator: 'included',
                  type: 'match',
                },
              ],
              description: 'a good one',
              effectScope: {
                type: 'global',
              },
              version: 'abc123',
            });
          });
        });
      });

      describe('and attempting to show Edit panel based on URL params', () => {
        const TRUSTED_APP_GET_URI = resolvePathVariables(TRUSTED_APPS_GET_API, {
          id: '9999-edit-8888',
        });

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

          renderResult = await renderWithListData();

          await reactTestingLibrary.act(async () => {
            await apiResponseForEditTrustedApp;
          });

          return renderResult;
        };

        beforeEach(() => {
          // Mock the API GET for the trusted application
          const priorMockImplementation = coreStart.http.get.getMockImplementation();
          coreStart.http.get.mockImplementation(async (...args) => {
            if ('string' === typeof args[0] && args[0] === TRUSTED_APP_GET_URI) {
              return {
                data: {
                  ...getFakeTrustedApp(),
                  id: '9999-edit-8888',
                  name: 'one app for edit',
                },
              };
            }
            if (priorMockImplementation) {
              return priorMockImplementation(...args);
            }
          });

          reactTestingLibrary.act(() => {
            history.push('/administration/trusted_apps?show=edit&id=9999-edit-8888');
          });
        });

        it('should retrieve trusted app via API using url `id`', async () => {
          renderResult = await renderAndWaitForGetApi();

          expect(coreStart.http.get).toHaveBeenCalledWith(TRUSTED_APP_GET_URI);

          expect(
            (
              renderResult.getByTestId(
                'addTrustedAppFlyout-createForm-nameTextField'
              ) as HTMLInputElement
            ).value
          ).toEqual('one app for edit');
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
          const priorMockImplementation = coreStart.http.get.getMockImplementation();
          coreStart.http.get.mockImplementation(async (...args) => {
            if ('string' === typeof args[0] && args[0] === TRUSTED_APP_GET_URI) {
              throw new Error('test: api error response');
            }
            if (priorMockImplementation) {
              return priorMockImplementation(...args);
            }
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
      const renderResult = render();
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

    beforeEach(() => mockListApis(coreStart.http));

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
      useIsExperimentalFeatureEnabledMock.mockReturnValue(true);
      const resetEnv = forceHTMLElementOffsetWidth();
      const renderResult = await renderAndClickAddButton();
      act(() => {
        fireEvent.click(renderResult.getByTestId('perPolicy'));
      });
      expect(renderResult.getByTestId('policy-abc123'));
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
        const renderResult = await renderAndClickAddButton();

        await fillInCreateForm();

        const flyoutAddButton = renderResult.getByTestId(
          'addTrustedAppFlyout-createButton'
        ) as HTMLButtonElement;

        expect(flyoutAddButton.disabled).toBe(false);
      });

      describe('and the Flyout Add button is clicked', () => {
        let renderResult: ReturnType<AppContextTestRender['render']>;
        let resolveHttpPost: (response?: PostTrustedAppCreateResponse) => void;
        let httpPostBody: string;
        let rejectHttpPost: (response: Error) => void;

        beforeEach(async () => {
          // Mock the http.post() call and expose `resolveHttpPost()` method so that
          // we can control when the API call response is returned, which will allow us
          // to test the UI behaviours while the API call is in flight
          coreStart.http.post.mockImplementation(
            // @ts-ignore
            async (_, options: HttpFetchOptions) => {
              return new Promise((resolve, reject) => {
                httpPostBody = options.body as string;
                resolveHttpPost = resolve;
                rejectHttpPost = reject;
              });
            }
          );

          renderResult = await renderAndClickAddButton();
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

        afterEach(() => resolveHttpPost());

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
          resolveHttpPost();
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
            const successCreateApiResponse: PostTrustedAppCreateResponse = {
              data: {
                ...(JSON.parse(httpPostBody) as NewTrustedApp),
                id: '1',
                version: 'abc123',
                created_at: '2020-09-16T14:09:45.484Z',
                created_by: 'kibana',
                updated_at: '2021-01-04T13:55:00.561Z',
                updated_by: 'me',
              },
            };
            await reactTestingLibrary.act(async () => {
              const serverResponseAction = waitForAction(
                'trustedAppCreationSubmissionResourceStateChanged'
              );
              coreStart.http.get.mockClear();
              resolveHttpPost(successCreateApiResponse);
              await serverResponseAction;
            });
          });

          it('should close the flyout', () => {
            expect(renderResult.queryByTestId('addTrustedAppFlyout')).toBeNull();
          });

          it('should show success toast notification', () => {
            expect(coreStart.notifications.toasts.addSuccess.mock.calls[0][0]).toEqual({
              text: '"one app" has been added to the Trusted Applications list.',
              title: 'Success!',
            });
          });

          it('should trigger the List to reload', () => {
            const isCalled = coreStart.http.get.mock.calls.some(
              (call) => call[0].toString() === TRUSTED_APPS_LIST_API
            );
            expect(isCalled).toEqual(true);
          });
        });

        describe('and if create failed', () => {
          beforeEach(async () => {
            const failedCreateApiResponse: Error & { body?: { message: string } } = new Error(
              'Bad call'
            );
            failedCreateApiResponse.body = {
              message: 'bad call',
            };
            await reactTestingLibrary.act(async () => {
              const serverResponseAction = waitForAction(
                'trustedAppCreationSubmissionResourceStateChanged'
              );
              coreStart.http.get.mockClear();
              rejectHttpPost(failedCreateApiResponse);
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
        const renderResult = await renderAndClickAddButton();
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

    describe('and there is a feature flag for agents policy', () => {
      it('should hide agents policy if feature flag is disabled', async () => {
        useIsExperimentalFeatureEnabledMock.mockReturnValue(false);
        const renderResult = await renderAndClickAddButton();
        expect(
          renderResult.queryByTestId('addTrustedAppFlyout-createForm-policySelection')
        ).toBeNull();
      });
      it('should display agents policy if feature flag is enabled', async () => {
        useIsExperimentalFeatureEnabledMock.mockReturnValue(true);
        const renderResult = await renderAndClickAddButton();
        expect(
          renderResult.queryByTestId('addTrustedAppFlyout-createForm-policySelection')
        ).toBeTruthy();
      });
    });
  });

  describe('and there are no trusted apps', () => {
    const releaseExistsResponse: jest.MockedFunction<() => Promise<GetTrustedAppsListResponse>> =
      jest.fn(async () => {
        return {
          data: [],
          total: 0,
          page: 1,
          per_page: 1,
        };
      });
    const releaseListResponse: jest.MockedFunction<() => Promise<GetTrustedAppsListResponse>> =
      jest.fn(async () => {
        return {
          data: [],
          total: 0,
          page: 1,
          per_page: 20,
        };
      });

    beforeEach(() => {
      const priorMockImplementation = coreStart.http.get.getMockImplementation();
      // @ts-ignore
      coreStart.http.get.mockImplementation((path, options) => {
        if (path === TRUSTED_APPS_LIST_API) {
          const { page, per_page: perPage } = options.query as { page: number; per_page: number };

          if (page === 1 && perPage === 1) {
            return releaseExistsResponse();
          } else {
            return releaseListResponse();
          }
        }

        if (path === PACKAGE_POLICY_API_ROUTES.LIST_PATTERN) {
          const policy = generator.generatePolicyPackagePolicy();
          policy.name = 'test policy A';
          policy.id = 'abc123';

          const response: GetPackagePoliciesResponse = {
            items: [policy],
            page: 1,
            perPage: 1000,
            total: 1,
          };
          return response;
        }
        if (priorMockImplementation) {
          return priorMockImplementation(path);
        }
      });
    });

    afterEach(() => {
      releaseExistsResponse.mockClear();
      releaseListResponse.mockClear();
    });

    it('should show a loader until trusted apps existence can be confirmed', async () => {
      // Make the call that checks if Trusted Apps exists not respond back
      releaseExistsResponse.mockImplementationOnce(() => new Promise(() => {}));
      const renderResult = render();
      expect(await renderResult.findByTestId('trustedAppsListLoader')).not.toBeNull();
    });

    it('should show Empty Prompt if not entries exist', async () => {
      const renderResult = render();
      await act(async () => {
        await waitForAction('trustedAppsExistStateChanged');
      });
      expect(await renderResult.findByTestId('trustedAppEmptyState')).not.toBeNull();
    });

    it('should hide empty prompt and show list after one trusted app is added', async () => {
      const renderResult = render();
      await act(async () => {
        await waitForAction('trustedAppsExistStateChanged');
      });
      expect(await renderResult.findByTestId('trustedAppEmptyState')).not.toBeNull();
      releaseListResponse.mockResolvedValueOnce({
        data: [getFakeTrustedApp()],
        total: 1,
        page: 1,
        per_page: 20,
      });
      releaseExistsResponse.mockResolvedValueOnce({
        data: [getFakeTrustedApp()],
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
      releaseListResponse.mockResolvedValueOnce({
        data: [getFakeTrustedApp()],
        total: 1,
        page: 1,
        per_page: 20,
      });
      releaseExistsResponse.mockResolvedValueOnce({
        data: [getFakeTrustedApp()],
        total: 1,
        page: 1,
        per_page: 1,
      });

      const renderResult = render();

      await act(async () => {
        await waitForAction('trustedAppsExistStateChanged');
      });

      expect(await renderResult.findByTestId('trustedAppsListPageContent')).not.toBeNull();

      releaseListResponse.mockResolvedValueOnce({
        data: [],
        total: 0,
        page: 1,
        per_page: 20,
      });
      releaseExistsResponse.mockResolvedValueOnce({
        data: [],
        total: 0,
        page: 1,
        per_page: 1,
      });

      await act(async () => {
        mockedContext.store.dispatch({
          type: 'trustedAppsListDataOutdated',
        });
        await waitForAction('trustedAppsListResourceStateChanged');
      });

      expect(await renderResult.findByTestId('trustedAppEmptyState')).not.toBeNull();
    });

    it('should not display the searchExceptions', async () => {
      const renderResult = render();
      await act(async () => {
        await waitForAction('trustedAppsExistStateChanged');
      });
      expect(renderResult.queryByTestId('searchExceptions')).toBeNull();
    });
  });

  describe('and the search is dispatched', () => {
    let renderResult: ReturnType<AppContextTestRender['render']>;
    beforeEach(async () => {
      mockListApis(coreStart.http);
      reactTestingLibrary.act(() => {
        history.push('/administration/trusted_apps?filter=test');
      });
      renderResult = render();
      await act(async () => {
        await waitForAction('trustedAppsListResourceStateChanged');
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
    let renderResult: ReturnType<AppContextTestRender['render']>;
    beforeEach(async () => {
      // Ensure implementation is defined before render to avoid undefined responses from hidden api calls
      const priorMockImplementation = coreStart.http.get.getMockImplementation();
      // @ts-ignore
      coreStart.http.get.mockImplementation((path, options) => {
        if (path === PACKAGE_POLICY_API_ROUTES.LIST_PATTERN) {
          const policy = generator.generatePolicyPackagePolicy();
          policy.name = 'test policy A';
          policy.id = 'abc123';

          const response: GetPackagePoliciesResponse = {
            items: [policy],
            page: 1,
            perPage: 1000,
            total: 1,
          };
          return response;
        }
        if (priorMockImplementation) {
          return priorMockImplementation(path);
        }
      });

      renderResult = render();
      await act(async () => {
        await waitForAction('trustedAppsListResourceStateChanged');
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

    it('back button is not present', () => {
      reactTestingLibrary.act(() => {
        history.push('/administration/trusted_apps');
      });
      expect(renderResult.queryByTestId('backToOrigin')).toBeNull();
    });
  });
});
