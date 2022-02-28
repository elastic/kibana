/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { waitFor } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import React from 'react';
import uuid from 'uuid';
import { getExceptionListItemSchemaMock } from '../../../../../../../lists/common/schemas/response/exception_list_item_schema.mock';
import {
  AppContextTestRender,
  createAppRootMockRenderer,
} from '../../../../../common/mock/endpoint';
import { deleteOneHostIsolationExceptionItem } from '../../service';
import { HostIsolationExceptionDeleteModal } from './delete_modal';

jest.mock('../../service');
const deleteOneHostIsolationExceptionItemMock = deleteOneHostIsolationExceptionItem as jest.Mock;

describe('When on the host isolation exceptions delete modal', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let coreStart: AppContextTestRender['coreStart'];
  let onCancel: (forceRefresh?: boolean) => void;
  let itemToDelete: ExceptionListItemSchema;

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();
    itemToDelete = getExceptionListItemSchemaMock();
    deleteOneHostIsolationExceptionItemMock.mockReset();
    onCancel = jest.fn();
    render = () =>
      (renderResult = mockedContext.render(
        <HostIsolationExceptionDeleteModal item={itemToDelete} onCancel={onCancel} />
      ));
    ({ coreStart } = mockedContext);
  });

  it('should render the delete modal with the cancel and submit buttons', () => {
    render();
    expect(renderResult.getByTestId('hostIsolationExceptionsDeleteModalCancelButton')).toBeTruthy();
    expect(
      renderResult.getByTestId('hostIsolationExceptionsDeleteModalConfirmButton')
    ).toBeTruthy();
  });

  it.each(['all', '0', '1', '2', '5'])(
    'should display a warning banner with how many policies (%s) will be affected. skipping non-policy-tags',
    (amount) => {
      if (amount === 'all') {
        itemToDelete.tags = ['policy:all', 'non-policy-tag'];
      } else {
        itemToDelete.tags = [
          ...Array.from({ length: +amount }, (_) => `policy:${uuid.v4()}`),
          'non-policy-tag',
        ];
      }
      render();
      expect(
        renderResult.getByTestId('hostIsolationExceptionsDeleteModalCalloutMessage')
      ).toHaveTextContent(`Deleting this entry will remove it from ${amount} associated`);
    }
  );

  it('should disable the buttons when confirm is pressed and show loading', async () => {
    render();

    // fake a delay on a response
    deleteOneHostIsolationExceptionItemMock.mockImplementationOnce(() => {
      return new Promise((resolve) => {
        setTimeout(resolve, 300);
      });
    });

    const submitButton = renderResult.baseElement.querySelector(
      '[data-test-subj="hostIsolationExceptionsDeleteModalConfirmButton"]'
    ) as HTMLButtonElement;

    const cancelButton = renderResult.baseElement.querySelector(
      '[data-test-subj="hostIsolationExceptionsDeleteModalConfirmButton"]'
    ) as HTMLButtonElement;

    userEvent.click(submitButton);

    // wait for the mock API to be called
    await waitFor(expect(deleteOneHostIsolationExceptionItemMock).toHaveBeenCalled);

    expect(submitButton.disabled).toBe(true);
    expect(cancelButton.disabled).toBe(true);
    expect(submitButton.querySelector('.euiLoadingSpinner')).not.toBeNull();
  });

  it('should call the onCancel callback when cancel is pressed', async () => {
    render();
    const cancelButton = renderResult.baseElement.querySelector(
      '[data-test-subj="hostIsolationExceptionsDeleteModalConfirmButton"]'
    ) as HTMLButtonElement;

    userEvent.click(cancelButton);
    await waitFor(() => {
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  it('should show success toast after the delete is completed and call onCancel with forceRefresh', async () => {
    deleteOneHostIsolationExceptionItemMock.mockResolvedValue({});
    render();

    const submitButton = renderResult.baseElement.querySelector(
      '[data-test-subj="hostIsolationExceptionsDeleteModalConfirmButton"]'
    ) as HTMLButtonElement;

    userEvent.click(submitButton);

    // wait for the mock API to be called
    await waitFor(expect(deleteOneHostIsolationExceptionItemMock).toHaveBeenCalled);

    expect(coreStart.notifications.toasts.addSuccess).toHaveBeenCalledWith(
      '"some name" has been removed from the host isolation exceptions list.'
    );
    expect(onCancel).toHaveBeenCalledWith(true);
  });

  it('should show error toast if error is encountered and call onCancel with forceRefresh', async () => {
    deleteOneHostIsolationExceptionItemMock.mockRejectedValue(
      new Error("That's not true. That's impossible")
    );
    render();

    const submitButton = renderResult.baseElement.querySelector(
      '[data-test-subj="hostIsolationExceptionsDeleteModalConfirmButton"]'
    ) as HTMLButtonElement;

    userEvent.click(submitButton);

    // wait for the mock API to be called
    await waitFor(expect(deleteOneHostIsolationExceptionItemMock).toHaveBeenCalled);

    expect(coreStart.notifications.toasts.addDanger).toHaveBeenCalledWith(
      'Unable to remove "some name" from the host isolation exceptions list. Reason: That\'s not true. That\'s impossible'
    );
    expect(onCancel).toHaveBeenCalledWith(true);
  });
});
