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
import { getPolicyHostIsolationExceptionsPath } from '../../../../../common/routing';
import { updateOneHostIsolationExceptionItem } from '../../../../host_isolation_exceptions/service';
import { PolicyHostIsolationExceptionsDeleteModal } from './delete_modal';

jest.mock('../../../../host_isolation_exceptions/service');

const updateOneHostIsolationExceptionItemMock = updateOneHostIsolationExceptionItem as jest.Mock;

describe('Policy details host isolation exceptions delete modal', () => {
  let policyId: string;
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let history: AppContextTestRender['history'];
  let mockedContext: AppContextTestRender;
  let exception: ExceptionListItemSchema;
  let onCancel: () => void;

  beforeEach(() => {
    policyId = uuid.v4();
    mockedContext = createAppRootMockRenderer();
    exception = getExceptionListItemSchemaMock();
    onCancel = jest.fn();
    updateOneHostIsolationExceptionItemMock.mockClear();
    ({ history } = mockedContext);
    render = () =>
      (renderResult = mockedContext.render(
        <PolicyHostIsolationExceptionsDeleteModal
          policyId={policyId}
          exception={exception}
          onCancel={onCancel}
        />
      ));

    act(() => {
      history.push(getPolicyHostIsolationExceptionsPath(policyId));
    });
  });

  it('should render with enabled buttons', () => {
    render();
    expect(renderResult.getByTestId('confirmModalCancelButton')).toBeEnabled();
    expect(renderResult.getByTestId('confirmModalConfirmButton')).toBeEnabled();
  });

  it('should disable the submit button while deleting ', async () => {
    updateOneHostIsolationExceptionItemMock.mockImplementation(() => {
      return new Promise((resolve) => setImmediate(resolve));
    });
    render();
    const confirmButton = renderResult.getByTestId('confirmModalConfirmButton');
    userEvent.click(confirmButton);

    await waitFor(() => {
      expect(confirmButton).toBeDisabled();
    });
  });

  it('should call the API with the removed policy from the exception tags', async () => {
    exception.tags = ['policy:1234', 'policy:4321', `policy:${policyId}`, 'not-a-policy-tag'];
    render();
    const confirmButton = renderResult.getByTestId('confirmModalConfirmButton');
    userEvent.click(confirmButton);

    await waitFor(() => {
      expect(updateOneHostIsolationExceptionItemMock).toHaveBeenCalledWith(
        mockedContext.coreStart.http,
        expect.objectContaining({
          id: exception.id,
          tags: ['policy:1234', 'policy:4321', 'not-a-policy-tag'],
        })
      );
    });
  });

  it('should show a success toast if the operation was success', async () => {
    updateOneHostIsolationExceptionItemMock.mockReturnValue('all good');
    render();
    const confirmButton = renderResult.getByTestId('confirmModalConfirmButton');
    userEvent.click(confirmButton);

    await waitFor(() => {
      expect(updateOneHostIsolationExceptionItemMock).toHaveBeenCalled();
    });

    expect(mockedContext.coreStart.notifications.toasts.addSuccess).toHaveBeenCalled();
  });

  it('should show an error toast if the operation failed', async () => {
    const error = new Error('the server is too far away');
    updateOneHostIsolationExceptionItemMock.mockRejectedValue(error);
    render();
    const confirmButton = renderResult.getByTestId('confirmModalConfirmButton');
    userEvent.click(confirmButton);

    await waitFor(() => {
      expect(updateOneHostIsolationExceptionItemMock).toHaveBeenCalled();
    });

    expect(mockedContext.coreStart.notifications.toasts.addError).toHaveBeenCalledWith(error, {
      title: 'Error while attempt to remove host isolation exception',
    });
  });
});
