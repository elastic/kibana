/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CreateExceptionListSchema,
  ExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { v4 as uuid } from 'uuid';
import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';
import type { AppContextTestRender } from '../../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../../common/mock/endpoint';
import { PolicyArtifactsDeleteModal } from './policy_artifacts_delete_modal';
import { exceptionsListAllHttpMocks } from '../../../../../mocks/exceptions_list_http_mocks';
import { ExceptionsListApiClient } from '../../../../../services/exceptions_list/exceptions_list_api_client';
import { POLICY_ARTIFACT_DELETE_MODAL_LABELS } from './translations';
import { getDeferred } from '../../../../../mocks/utils';

const listType: Array<CreateExceptionListSchema['type']> = [
  'endpoint_events',
  'detection',
  'endpoint',
  'endpoint_trusted_apps',
  'endpoint_host_isolation_exceptions',
  'endpoint_blocklists',
];

describe.each(listType)('Policy details %s artifact delete modal', (type) => {
  let policyId: string;
  let render: () => Promise<ReturnType<AppContextTestRender['render']>>;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let mockedContext: AppContextTestRender;
  let exception: ExceptionListItemSchema;
  let mockedApi: ReturnType<typeof exceptionsListAllHttpMocks>;
  let onCloseMock: () => jest.Mock;

  beforeEach(() => {
    policyId = uuid.v4();
    mockedContext = createAppRootMockRenderer();
    exception = getExceptionListItemSchemaMock();
    onCloseMock = jest.fn();
    mockedApi = exceptionsListAllHttpMocks(mockedContext.coreStart.http);
    render = async () => {
      await act(async () => {
        renderResult = mockedContext.render(
          <PolicyArtifactsDeleteModal
            policyId={policyId}
            policyName="fakeName"
            apiClient={ExceptionsListApiClient.getInstance(
              mockedContext.coreStart.http,
              'test_list_id',
              { description: 'test description', name: 'test_api_client', type }
            )}
            exception={exception}
            onClose={onCloseMock}
            labels={POLICY_ARTIFACT_DELETE_MODAL_LABELS}
          />
        );

        mockedApi.responseProvider.exceptionsFind.mockReturnValue({
          data: [],
          total: 0,
          page: 1,
          per_page: 10,
        });
      });
      return renderResult;
    };
  });

  it('should render with enabled buttons', async () => {
    await render();
    expect(renderResult.getByTestId('confirmModalCancelButton')).toBeEnabled();
    expect(renderResult.getByTestId('confirmModalConfirmButton')).toBeEnabled();
  });

  it('should disable the submit button while deleting ', async () => {
    const deferred = getDeferred();
    mockedApi.responseProvider.exceptionUpdate.mockDelay.mockReturnValue(deferred.promise);
    await render();
    const confirmButton = renderResult.getByTestId('confirmModalConfirmButton');
    userEvent.click(confirmButton);

    await waitFor(() => {
      expect(confirmButton).toBeDisabled();
    });

    await act(async () => {
      deferred.resolve(); // cleanup
    });
  });

  it('should call the API with the removed policy from the exception tags', async () => {
    exception.tags = ['policy:1234', 'policy:4321', `policy:${policyId}`, 'not-a-policy-tag'];
    await render();
    const confirmButton = renderResult.getByTestId('confirmModalConfirmButton');
    userEvent.click(confirmButton);
    await waitFor(() => {
      expect(mockedApi.responseProvider.exceptionUpdate).toHaveBeenLastCalledWith({
        body: JSON.stringify(
          ExceptionsListApiClient.cleanExceptionsBeforeUpdate({
            ...exception,
            tags: ['policy:1234', 'policy:4321', 'not-a-policy-tag'],
          })
        ),
        path: '/api/exception_lists/items',
      });
    });
  });

  it('should show a success toast if the operation was success', async () => {
    await render();
    const confirmButton = renderResult.getByTestId('confirmModalConfirmButton');
    userEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockedApi.responseProvider.exceptionUpdate).toHaveBeenCalled();
    });

    expect(onCloseMock).toHaveBeenCalled();
    expect(mockedContext.coreStart.notifications.toasts.addSuccess).toHaveBeenCalled();
  });

  it('should show an error toast if the operation failed', async () => {
    const error = new Error('the server is too far away');
    mockedApi.responseProvider.exceptionUpdate.mockImplementation(() => {
      throw error;
    });

    await render();
    const confirmButton = renderResult.getByTestId('confirmModalConfirmButton');
    userEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockedApi.responseProvider.exceptionUpdate).toHaveBeenCalled();
    });

    expect(mockedContext.coreStart.notifications.toasts.addError).toHaveBeenCalledWith(error, {
      title: 'Error while attempting to remove artifact',
    });
  });
});
