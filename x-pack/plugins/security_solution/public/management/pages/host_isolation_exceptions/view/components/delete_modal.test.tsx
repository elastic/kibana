/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { act } from '@testing-library/react';
import {
  AppContextTestRender,
  createAppRootMockRenderer,
} from '../../../../../common/mock/endpoint';
import { HostIsolationExceptionDeleteModal } from './delete_modal';
import { isFailedResourceState, isLoadedResourceState } from '../../../../state';
import { getHostIsolationExceptionItems, deleteHostIsolationExceptionItems } from '../../service';
import { getExceptionListItemSchemaMock } from '../../../../../../../lists/common/schemas/response/exception_list_item_schema.mock';
import { fireEvent } from '@testing-library/dom';

jest.mock('../../service');
const getHostIsolationExceptionItemsMock = getHostIsolationExceptionItems as jest.Mock;
const deleteHostIsolationExceptionItemsMock = deleteHostIsolationExceptionItems as jest.Mock;

describe('When on the host isolation exceptions delete modal', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let waitForAction: AppContextTestRender['middlewareSpy']['waitForAction'];
  let coreStart: AppContextTestRender['coreStart'];

  beforeEach(() => {
    const itemToDelete = getExceptionListItemSchemaMock();
    getHostIsolationExceptionItemsMock.mockReset();
    deleteHostIsolationExceptionItemsMock.mockReset();
    const mockedContext = createAppRootMockRenderer();
    mockedContext.store.dispatch({
      type: 'hostIsolationExceptionsMarkToDelete',
      payload: itemToDelete,
    });
    render = () => (renderResult = mockedContext.render(<HostIsolationExceptionDeleteModal />));
    waitForAction = mockedContext.middlewareSpy.waitForAction;
    ({ coreStart } = mockedContext);
  });

  it('should render the delete modal with the cancel and submit buttons', () => {
    render();
    expect(renderResult.getByTestId('hostIsolationExceptionsDeleteModalCancelButton')).toBeTruthy();
    expect(
      renderResult.getByTestId('hostIsolationExceptionsDeleteModalConfirmButton')
    ).toBeTruthy();
  });

  it('should disable the buttons when confirm is pressed and show loading', async () => {
    render();

    const submitButton = renderResult.baseElement.querySelector(
      '[data-test-subj="hostIsolationExceptionsDeleteModalConfirmButton"]'
    )! as HTMLButtonElement;

    const cancelButton = renderResult.baseElement.querySelector(
      '[data-test-subj="hostIsolationExceptionsDeleteModalConfirmButton"]'
    )! as HTMLButtonElement;

    act(() => {
      fireEvent.click(submitButton);
    });

    expect(submitButton.disabled).toBe(true);
    expect(cancelButton.disabled).toBe(true);
    expect(submitButton.querySelector('.euiLoadingSpinner')).not.toBeNull();
  });

  it('should clear the item marked to delete when cancel is pressed', async () => {
    render();
    const cancelButton = renderResult.baseElement.querySelector(
      '[data-test-subj="hostIsolationExceptionsDeleteModalConfirmButton"]'
    )! as HTMLButtonElement;

    const waiter = waitForAction('hostIsolationExceptionsMarkToDelete', {
      validate: ({ payload }) => {
        return payload === undefined;
      },
    });

    act(() => {
      fireEvent.click(cancelButton);
    });
    await waiter;
  });

  it('should show success toast after the delete is completed', async () => {
    render();
    const updateCompleted = waitForAction('hostIsolationExceptionsDeleteStatusChanged', {
      validate(action) {
        return isLoadedResourceState(action.payload);
      },
    });

    const submitButton = renderResult.baseElement.querySelector(
      '[data-test-subj="hostIsolationExceptionsDeleteModalConfirmButton"]'
    )! as HTMLButtonElement;

    await act(async () => {
      fireEvent.click(submitButton);
      await updateCompleted;
    });

    expect(coreStart.notifications.toasts.addSuccess).toHaveBeenCalledWith(
      '"some name" has been removed from the Host Isolation Exceptions list.'
    );
  });

  it('should show error toast if error is encountered', async () => {
    deleteHostIsolationExceptionItemsMock.mockRejectedValue(
      new Error("That's not true. That's impossible")
    );
    render();
    const updateFailure = waitForAction('hostIsolationExceptionsDeleteStatusChanged', {
      validate(action) {
        return isFailedResourceState(action.payload);
      },
    });

    const submitButton = renderResult.baseElement.querySelector(
      '[data-test-subj="hostIsolationExceptionsDeleteModalConfirmButton"]'
    )! as HTMLButtonElement;

    await act(async () => {
      fireEvent.click(submitButton);
      await updateFailure;
    });

    expect(coreStart.notifications.toasts.addDanger).toHaveBeenCalledWith(
      'Unable to remove "some name" from the Host Isolation Exceptions list. Reason: That\'s not true. That\'s impossible'
    );
  });
});
