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
import { act, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ArtifactFormComponentProps } from './types';
import { HttpFetchError } from 'kibana/public';
import { ExceptionsListItemGenerator } from '../../../../common/endpoint/data_generators/exceptions_list_item_generator';

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

    const apiClient = TrustedAppsApiClient.getInstance(coreStart.http);
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

      // FIXME:PT revisit these tests. having hard time making them work
      describe.skip('and submit fails', () => {
        beforeEach(async () => {
          await renderAndWaitForFlyout();

          mockedApi.responseProvider.trustedAppCreate.mockImplementation(() => {
            // eslint-disable-next-line no-throw-literal
            throw new Error('oh oh. no good!') as HttpFetchError;
          });

          act(() => {
            userEvent.click(renderResult.getByTestId('testPage-flyout-submitButton'));
          });
        });

        it('should re-enable `Cancel` and `Submit` buttons', async () => {
          await act(async () => {
            await waitFor(
              () => expect(mockedApi.responseProvider.trustedAppCreate).toHaveBeenCalled(),
              { timeout: 3000 }
            );
          });

          await act(async () => {
            await waitFor(() => {
              expect(renderResult.getByTestId('formError')).toBeTruthy();
            });
          });

          const cancelButtonDisabledState = (
            renderResult.getByTestId('testPage-flyout-cancelButton') as HTMLButtonElement
          ).disabled;

          expect(cancelButtonDisabledState).toBe(false);

          const submitButtonDisabledState = (
            renderResult.getByTestId('testPage-flyout-submitButton') as HTMLButtonElement
          ).disabled;

          expect(submitButtonDisabledState).toBe(false);
        });

        it.todo('should pass error along to the Form component and reset disabled back to `false`');
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
      it.todo('should show loader while initializing in edit mode');

      it.todo(
        'should show expired license warning when unsupported features are being used (downgrade scenario)'
      );

      it.todo('should provide Form component with the item for edit');

      it.todo('should show error toast and close flyout if item for edit does not exist');
    });
  });

  describe('and data exists', () => {
    // FIXME:PT with data

    it.todo('should show list loading indicator while results are retrieved');

    it.todo(`should show cards with results`);

    it.todo('should show card actions');

    it.todo('should persist pagination changes to the URL');

    describe('and interacting with card actions', () => {
      it.todo('should display the Edit flyout');

      it.todo('should display the Delete modal');

      describe('and interacting with the deletion modal', () => {
        it.todo('should show Cancel and Delete buttons enabled');

        it.todo('should close modal if Cancel/Close buttons are clicked');

        it.todo('should prevent modal from being closed while deletion is in flight');

        it.todo('should show success toast if deleted successfully');

        it.todo('should show error toast if deletion failed');
      });
    });

    describe('and search bar is used', () => {
      it.todo('should persist filter to the URL params');

      it.todo('should persist policy filter to the URL params');

      it.todo('should trigger a current page data fetch when Refresh button is clicked');

      it.todo('should show a no results found message if filter did not return any results');
    });
  });
});
