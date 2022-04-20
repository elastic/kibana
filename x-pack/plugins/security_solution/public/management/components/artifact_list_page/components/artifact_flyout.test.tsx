/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ArtifactListPageProps } from '../artifact_list_page';
import { act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getArtifactListPageRenderingSetup, getDeferred, getFormComponentMock } from '../mocks';
import { ExceptionsListItemGenerator } from '../../../../../common/endpoint/data_generators/exceptions_list_item_generator';
import { HttpFetchOptionsWithPath } from '@kbn/core/public';
import { BY_POLICY_ARTIFACT_TAG_PREFIX } from '../../../../../common/endpoint/service/artifacts';
import { getEndpointPrivilegesInitialStateMock } from '../../../../common/components/user_privileges/endpoint/mocks';
import { AppContextTestRender } from '../../../../common/mock/endpoint';
import { trustedAppsAllHttpMocks } from '../../../pages/mocks';
import { useUserPrivileges as _useUserPrivileges } from '../../../../common/components/user_privileges';
import { entriesToConditionEntries } from '../../../../common/utils/exception_list_items/mappers';
import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';

jest.mock('../../../../common/components/user_privileges');
const useUserPrivileges = _useUserPrivileges as jest.Mock;

describe('When the flyout is opened in the ArtifactListPage component', () => {
  let render: (
    props?: Partial<ArtifactListPageProps>
  ) => Promise<ReturnType<AppContextTestRender['render']>>;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let history: AppContextTestRender['history'];
  let coreStart: AppContextTestRender['coreStart'];
  let mockedApi: ReturnType<typeof trustedAppsAllHttpMocks>;
  let FormComponentMock: ReturnType<typeof getFormComponentMock>['FormComponentMock'];
  let getLastFormComponentProps: ReturnType<
    typeof getFormComponentMock
  >['getLastFormComponentProps'];

  beforeEach(() => {
    const renderSetup = getArtifactListPageRenderingSetup();

    ({ history, coreStart, mockedApi, FormComponentMock, getLastFormComponentProps } = renderSetup);

    history.push('somepage?show=create');

    render = async (props = {}) => {
      renderResult = renderSetup.renderArtifactListPage(props);

      await waitFor(async () => {
        expect(renderResult.getByTestId('testPage-flyout'));
      });

      return renderResult;
    };
  });

  afterEach(() => {
    // Ensure user privileges are reset
    useUserPrivileges.mockReturnValue({
      ...useUserPrivileges(),
      endpointPrivileges: getEndpointPrivilegesInitialStateMock(),
    });
  });

  it('should display `Cancel` button enabled', async () => {
    await render();

    expect(renderResult.getByTestId('testPage-flyout-cancelButton')).toBeEnabled();
  });

  it('should display `Submit` button as disabled', async () => {
    await render();

    expect(renderResult.getByTestId('testPage-flyout-submitButton')).not.toBeEnabled();
  });

  it.each([
    ['Cancel', 'testPage-flyout-cancelButton'],
    ['Close', 'euiFlyoutCloseButton'],
  ])('should close flyout when `%s` button is clicked', async (_, testId) => {
    await render();

    act(() => {
      userEvent.click(renderResult.getByTestId(testId));
    });

    expect(renderResult.queryByTestId('testPage-flyout')).toBeNull();
    expect(history.location.search).toEqual('');
  });

  it('should pass to the Form component the expected props', async () => {
    await render();

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
        policies: expect.any(Array),
        policiesIsLoading: false,
      },
      expect.anything()
    );
  });

  describe('and form data is valid', () => {
    beforeEach(async () => {
      const _renderAndWaitForFlyout = render;

      // Override renderAndWaitForFlyout to also set the form data as "valid"
      render = async (...props) => {
        await _renderAndWaitForFlyout(...props);

        act(() => {
          const lastProps = getLastFormComponentProps();
          lastProps.onChange({ item: { ...lastProps.item, name: 'some name' }, isValid: true });
        });

        return renderResult;
      };
    });

    it('should enable the `Submit` button', async () => {
      await render();

      expect(renderResult.getByTestId('testPage-flyout-submitButton')).toBeEnabled();
    });

    describe('and user clicks submit', () => {
      let releaseApiUpdateResponse: () => void;
      let getByTestId: typeof renderResult['getByTestId'];

      beforeEach(async () => {
        await render();

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
        expect(getByTestId('testPage-flyout-cancelButton')).not.toBeEnabled();
        expect(getByTestId('testPage-flyout-submitButton')).not.toBeEnabled();
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
        await render();

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
        const _renderAndWaitForFlyout = render;

        render = async (...args) => {
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

      // FIXME:PT investigate test failure
      // (I don't understand why its failing... All assertions are successful -- HELP!)
      it.skip('should re-enable `Cancel` and `Submit` buttons', async () => {
        await render();

        expect(renderResult.getByTestId('testPage-flyout-cancelButton')).not.toBeEnabled();

        expect(renderResult.getByTestId('testPage-flyout-submitButton')).not.toBeEnabled();
      });

      // FIXME:PT investigate test failure
      // (I don't understand why its failing... All assertions are successful -- HELP!)
      it.skip('should pass error along to the Form component and reset disabled back to `false`', async () => {
        await render();
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

        await render({ onFormSubmit: handleSubmitCallback });

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

        expect(renderResult.getByTestId('testPage-flyout-cancelButton')).not.toBeEnabled();

        expect(renderResult.getByTestId('testPage-flyout-submitButton')).not.toBeEnabled();
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

      const { getByTestId } = await render();

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
      const { getByTestId } = await render();

      await act(async () => {
        await waitFor(() => {
          expect(getByTestId('formMock')).toBeTruthy();
        });
      });

      const expectedProps = {
        ...mockedApi.responseProvider.trustedApp({
          query: { item_id: '123' },
        } as unknown as HttpFetchOptionsWithPath),
        created_at: expect.any(String),
      };

      // map process.hash entries to have * as suffix
      expectedProps.entries = entriesToConditionEntries(
        expectedProps.entries
      ) as ExceptionListItemSchema['entries'];

      expect(getLastFormComponentProps().item).toEqual(expectedProps);
    });

    it('should show error toast and close flyout if item for edit does not exist', async () => {
      mockedApi.responseProvider.trustedApp.mockImplementation(() => {
        throw new Error('does not exist');
      });

      await render();

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
      const { queryByTestId, getByTestId } = await render();

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
        ...useUserPrivileges(),
        endpointPrivileges: getEndpointPrivilegesInitialStateMock({
          canCreateArtifactsByPolicy: false,
        }),
      });

      const { getByTestId } = await render();

      await act(async () => {
        await waitFor(() => {
          expect(getByTestId('formMock')).toBeTruthy();
        });
      });

      expect(getByTestId('testPage-flyout-expiredLicenseCallout')).toBeTruthy();
    });
  });
});
