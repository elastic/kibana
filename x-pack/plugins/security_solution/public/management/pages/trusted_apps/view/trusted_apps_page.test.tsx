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
  GetTrustedListAppsResponse,
  NewTrustedApp,
  OperatingSystem,
  PostTrustedAppCreateResponse,
  TrustedApp,
} from '../../../../../common/endpoint/types';
import { HttpFetchOptions } from 'kibana/public';
import { TRUSTED_APPS_LIST_API } from '../../../../../common/endpoint/constants';

jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => ({
  htmlIdGenerator: () => () => 'mockId',
}));

describe('When on the Trusted Apps Page', () => {
  const expectedAboutInfo =
    'Add a trusted application to improve performance or alleviate conflicts with other applications running on your hosts. Trusted applications will be applied to hosts running Endpoint Security.';

  let mockedContext: AppContextTestRender;
  let history: AppContextTestRender['history'];
  let coreStart: AppContextTestRender['coreStart'];
  let waitForAction: MiddlewareActionSpyHelper['waitForAction'];
  let render: () => ReturnType<AppContextTestRender['render']>;
  const originalScrollTo = window.scrollTo;
  const act = reactTestingLibrary.act;

  const getFakeTrustedApp = (): TrustedApp => ({
    id: '1111-2222-3333-4444',
    name: 'one app',
    os: OperatingSystem.WINDOWS,
    created_at: '2021-01-04T13:55:00.561Z',
    created_by: 'me',
    description: 'a good one',
    entries: [
      {
        field: ConditionEntryField.PATH,
        value: 'one/two',
        operator: 'included',
        type: 'match',
      },
    ],
  });

  const mockListApis = (http: AppContextTestRender['coreStart']['http']) => {
    const currentGetHandler = http.get.getMockImplementation();

    http.get.mockImplementation(async (...args) => {
      const path = (args[0] as unknown) as string;
      // @ts-ignore
      const httpOptions = args[1] as HttpFetchOptions;

      if (path === TRUSTED_APPS_LIST_API) {
        return {
          data: [getFakeTrustedApp()],
          total: 50, // << Should be a value large enough to fulfill two pages
          page: httpOptions?.query?.page ?? 1,
          per_page: httpOptions?.query?.per_page ?? 20,
        };
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

    history = mockedContext.history;
    coreStart = mockedContext.coreStart;
    waitForAction = mockedContext.middlewareSpy.waitForAction;
    render = () => mockedContext.render(<TrustedAppsPage />);
    reactTestingLibrary.act(() => {
      history.push('/trusted_apps');
    });
    window.scrollTo = jest.fn();
  });

  describe('and there is trusted app entries', () => {
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
      const addButton = await getByTestId('trustedAppsListAddButton');
      expect(addButton.textContent).toBe('Add Trusted Application');
    });
  });

  describe('when the Add Trusted App button is clicked', () => {
    const renderAndClickAddButton = async (): Promise<
      ReturnType<AppContextTestRender['render']>
    > => {
      const renderResult = render();
      await act(async () => {
        await waitForAction('trustedAppsListResourceStateChanged');
      });
      const addButton = renderResult.getByTestId('trustedAppsListAddButton');
      reactTestingLibrary.act(() => {
        fireEvent.click(addButton, { button: 1 });
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
    });

    it('should update the URL to indicate the flyout is opened', async () => {
      await renderAndClickAddButton();
      expect(/show\=create/.test(history.location.search)).toBe(true);
    });

    it('should preserve other URL search params', async () => {
      reactTestingLibrary.act(() => {
        history.push('/trusted_apps?page_index=2&page_size=20');
      });
      await renderAndClickAddButton();
      expect(history.location.search).toBe('?page_index=2&page_size=20&show=create');
    });

    it('should display create form', async () => {
      const { queryByTestId } = await renderAndClickAddButton();
      expect(queryByTestId('addTrustedAppFlyout-createForm')).not.toBeNull();
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
      reactTestingLibrary.act(() => {
        fireEvent.click(cancelButton, { button: 1 });
      });
      expect(queryByTestId('addTrustedAppFlyout')).toBeNull();
      expect(history.location.search).toBe('');
    });

    it('should close flyout if flyout close button is clicked', async () => {
      const { getByTestId, queryByTestId } = await renderAndClickAddButton();
      const flyoutCloseButton = getByTestId('euiFlyoutCloseButton');
      reactTestingLibrary.act(() => {
        fireEvent.click(flyoutCloseButton, { button: 1 });
      });
      expect(queryByTestId('addTrustedAppFlyout')).toBeNull();
      expect(history.location.search).toBe('');
    });

    describe('and when the form data is valid', () => {
      const fillInCreateForm = ({ getByTestId }: ReturnType<AppContextTestRender['render']>) => {
        reactTestingLibrary.act(() => {
          fireEvent.change(getByTestId('addTrustedAppFlyout-createForm-nameTextField'), {
            target: { value: 'trusted app A' },
          });

          fireEvent.change(
            getByTestId('addTrustedAppFlyout-createForm-conditionsBuilder-group1-entry0-value'),
            { target: { value: '44ed10b389dbcd1cf16cec79d16d7378' } }
          );

          fireEvent.change(getByTestId('addTrustedAppFlyout-createForm-descriptionField'), {
            target: { value: 'let this be' },
          });
        });
      };

      it('should enable the Flyout Add button', async () => {
        const renderResult = await renderAndClickAddButton();
        const { getByTestId } = renderResult;
        fillInCreateForm(renderResult);
        const flyoutAddButton = getByTestId(
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
            async (path: string, options: HttpFetchOptions) => {
              return new Promise((resolve, reject) => {
                httpPostBody = options.body as string;
                resolveHttpPost = resolve;
                rejectHttpPost = reject;
              });
            }
          );

          renderResult = await renderAndClickAddButton();
          fillInCreateForm(renderResult);
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
                created_at: '2020-09-16T14:09:45.484Z',
                created_by: 'kibana',
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

          it('should close the flyout', async () => {
            expect(renderResult.queryByTestId('addTrustedAppFlyout')).toBeNull();
          });

          it('should show success toast notification', async () => {
            expect(coreStart.notifications.toasts.addSuccess.mock.calls[0][0]).toEqual(
              '"trusted app A" has been added to the Trusted Applications list.'
            );
          });

          it('should trigger the List to reload', async () => {
            expect(coreStart.http.get.mock.calls[0][0]).toEqual(TRUSTED_APPS_LIST_API);
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

          it('should continue to show the flyout', async () => {
            expect(renderResult.getByTestId('addTrustedAppFlyout')).not.toBeNull();
          });

          it('should enable the Cancel Button', async () => {
            expect(
              (renderResult.getByTestId('addTrustedAppFlyout-cancelButton') as HTMLButtonElement)
                .disabled
            ).toBe(false);
          });

          it('should show the dialog close button', async () => {
            expect(renderResult.getByTestId('euiFlyoutCloseButton')).not.toBeNull();
          });

          it('should enable the flyout Add button and remove loading indicating', () => {
            expect(
              (renderResult.getByTestId('addTrustedAppFlyout-createButton') as HTMLButtonElement)
                .disabled
            ).toBe(false);
          });

          it('should show API errors in the form', async () => {
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
  });

  describe('and there are no trusted apps', () => {
    const releaseExistsResponse: jest.MockedFunction<
      () => Promise<GetTrustedListAppsResponse>
    > = jest.fn(async () => {
      return {
        data: [],
        total: 0,
        page: 1,
        per_page: 1,
      };
    });
    const releaseListResponse: jest.MockedFunction<
      () => Promise<GetTrustedListAppsResponse>
    > = jest.fn(async () => {
      return {
        data: [],
        total: 0,
        page: 1,
        per_page: 20,
      };
    });

    beforeEach(() => {
      // @ts-ignore
      coreStart.http.get.mockImplementation(async (path, options) => {
        if (path === TRUSTED_APPS_LIST_API) {
          const { page, per_page: perPage } = options.query as { page: number; per_page: number };

          if (page === 1 && perPage === 1) {
            return releaseExistsResponse();
          } else {
            return releaseListResponse();
          }
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
  });
});
