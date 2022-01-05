/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import uuid from 'uuid';
import { getExceptionListItemSchemaMock } from '../../../../../../../../lists/common/schemas/response/exception_list_item_schema.mock';
import {
  AppContextTestRender,
  createAppRootMockRenderer,
} from '../../../../../../common/mock/endpoint';
import { PolicyEventFiltersDeleteModal } from './policy_event_filters_delete_modal';
import { eventFiltersListQueryHttpMock } from '../../../../event_filters/test_utils';
import { EventFiltersHttpService } from '../../../../event_filters/service';

describe('Policy details event filter delete modal', () => {
  let policyId: string;
  let render: () => Promise<ReturnType<AppContextTestRender['render']>>;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let mockedContext: AppContextTestRender;
  let exception: ExceptionListItemSchema;
  let mockedApi: ReturnType<typeof eventFiltersListQueryHttpMock>;
  let onCancel: () => void;

  beforeEach(() => {
    policyId = uuid.v4();
    mockedContext = createAppRootMockRenderer();
    exception = getExceptionListItemSchemaMock();
    onCancel = jest.fn();
    mockedApi = eventFiltersListQueryHttpMock(mockedContext.coreStart.http);
    render = async () => {
      await act(async () => {
        renderResult = mockedContext.render(
          <PolicyEventFiltersDeleteModal
            policyId={policyId}
            onCancel={onCancel}
            exception={exception}
          />
        );
        await waitFor(mockedApi.responseProvider.eventFiltersList);
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
    await render();
    const confirmButton = renderResult.getByTestId('confirmModalConfirmButton');
    userEvent.click(confirmButton);

    await waitFor(() => {
      expect(confirmButton).toBeDisabled();
    });
  });

  it('should call the API with the removed policy from the exception tags', async () => {
    exception.tags = ['policy:1234', 'policy:4321', `policy:${policyId}`, 'not-a-policy-tag'];
    await render();
    const confirmButton = renderResult.getByTestId('confirmModalConfirmButton');
    userEvent.click(confirmButton);
    await waitFor(() => {
      expect(mockedApi.responseProvider.eventFiltersUpdateOne).toHaveBeenLastCalledWith({
        body: JSON.stringify(
          EventFiltersHttpService.cleanEventFilterToUpdate({
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
      expect(mockedApi.responseProvider.eventFiltersUpdateOne).toHaveBeenCalled();
    });

    expect(onCancel).toHaveBeenCalled();
    expect(mockedContext.coreStart.notifications.toasts.addSuccess).toHaveBeenCalled();
  });

  it('should show an error toast if the operation failed', async () => {
    const error = new Error('the server is too far away');
    mockedApi.responseProvider.eventFiltersUpdateOne.mockImplementation(() => {
      throw error;
    });

    await render();
    const confirmButton = renderResult.getByTestId('confirmModalConfirmButton');
    userEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockedApi.responseProvider.eventFiltersUpdateOne).toHaveBeenCalled();
    });

    expect(mockedContext.coreStart.notifications.toasts.addError).toHaveBeenCalledWith(error, {
      title: 'Error while attempt to remove event filter',
    });
  });
});
