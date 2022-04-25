/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  AppContextTestRender,
  createAppRootMockRenderer,
} from '../../../../../common/mock/endpoint';
import { act } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { EventFilterDeleteModal } from './event_filter_delete_modal';
import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';
import { showDeleteModal } from '../../store/selector';
import { isFailedResourceState, isLoadedResourceState } from '../../../../state';
import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';

describe('When event filters delete modal is shown', () => {
  let renderAndSetup: (
    customEventFilterProps?: Partial<ExceptionListItemSchema>
  ) => Promise<ReturnType<AppContextTestRender['render']>>;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let coreStart: AppContextTestRender['coreStart'];
  let history: AppContextTestRender['history'];
  let waitForAction: AppContextTestRender['middlewareSpy']['waitForAction'];
  let store: AppContextTestRender['store'];

  const getConfirmButton = () =>
    renderResult.baseElement.querySelector(
      '[data-test-subj="eventFilterDeleteModalConfirmButton"]'
    ) as HTMLButtonElement;

  const getCancelButton = () =>
    renderResult.baseElement.querySelector(
      '[data-test-subj="eventFilterDeleteModalCancelButton"]'
    ) as HTMLButtonElement;

  const getCurrentState = () => store.getState().management.eventFilters;

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();

    ({ history, store, coreStart } = mockedContext);
    renderAndSetup = async (customEventFilterProps) => {
      renderResult = mockedContext.render(<EventFilterDeleteModal />);

      await act(async () => {
        history.push('/administration/event_filters');

        await waitForAction('userChangedUrl');

        mockedContext.store.dispatch({
          type: 'eventFilterForDeletion',
          payload: getExceptionListItemSchemaMock({
            id: '123',
            name: 'tic-tac-toe',
            tags: [],
            ...(customEventFilterProps ? customEventFilterProps : {}),
          }),
        });
      });

      return renderResult;
    };

    waitForAction = mockedContext.middlewareSpy.waitForAction;
  });

  it("should display calllout when it's assigned to one policy", async () => {
    await renderAndSetup({ tags: ['policy:1'] });
    expect(renderResult.getByTestId('eventFilterDeleteModalCalloutMessage').textContent).toMatch(
      /Deleting this entry will remove it from 1 associated policy./
    );
  });

  it("should display calllout when it's assigned to more than one policy", async () => {
    await renderAndSetup({ tags: ['policy:1', 'policy:2', 'policy:3'] });
    expect(renderResult.getByTestId('eventFilterDeleteModalCalloutMessage').textContent).toMatch(
      /Deleting this entry will remove it from 3 associated policies./
    );
  });

  it("should display calllout when it's assigned globally", async () => {
    await renderAndSetup({ tags: ['policy:all'] });
    expect(renderResult.getByTestId('eventFilterDeleteModalCalloutMessage').textContent).toMatch(
      /Deleting this entry will remove it from all associated policies./
    );
  });

  it("should display calllout when it's unassigned", async () => {
    await renderAndSetup({ tags: [] });
    expect(renderResult.getByTestId('eventFilterDeleteModalCalloutMessage').textContent).toMatch(
      /Deleting this entry will remove it from 0 associated policies./
    );
  });

  it('should close dialog if cancel button is clicked', async () => {
    await renderAndSetup();
    act(() => {
      fireEvent.click(getCancelButton());
    });

    expect(showDeleteModal(getCurrentState())).toBe(false);
  });

  it('should close dialog if the close X button is clicked', async () => {
    await renderAndSetup();
    const dialogCloseButton = renderResult.baseElement.querySelector(
      '[aria-label="Closes this modal window"]'
    )!;
    act(() => {
      fireEvent.click(dialogCloseButton);
    });

    expect(showDeleteModal(getCurrentState())).toBe(false);
  });

  it('should disable action buttons when confirmed', async () => {
    await renderAndSetup();
    act(() => {
      fireEvent.click(getConfirmButton());
    });

    expect(getCancelButton().disabled).toBe(true);
    expect(getConfirmButton().disabled).toBe(true);
  });

  it('should set confirm button to loading', async () => {
    await renderAndSetup();
    act(() => {
      fireEvent.click(getConfirmButton());
    });

    expect(getConfirmButton().querySelector('.euiLoadingSpinner')).not.toBeNull();
  });

  it('should show success toast', async () => {
    await renderAndSetup();
    const updateCompleted = waitForAction('eventFilterDeleteStatusChanged', {
      validate(action) {
        return isLoadedResourceState(action.payload);
      },
    });

    await act(async () => {
      fireEvent.click(getConfirmButton());
      await updateCompleted;
    });

    expect(coreStart.notifications.toasts.addSuccess).toHaveBeenCalledWith(
      '"tic-tac-toe" has been removed from the event filters list.'
    );
  });

  it('should show error toast if error is countered', async () => {
    coreStart.http.delete.mockRejectedValue(new Error('oh oh'));
    await renderAndSetup();
    const updateFailure = waitForAction('eventFilterDeleteStatusChanged', {
      validate(action) {
        return isFailedResourceState(action.payload);
      },
    });

    await act(async () => {
      fireEvent.click(getConfirmButton());
      await updateFailure;
    });

    expect(coreStart.notifications.toasts.addDanger).toHaveBeenCalledWith(
      'Unable to remove "tic-tac-toe" from the event filters list. Reason: oh oh'
    );
    expect(showDeleteModal(getCurrentState())).toBe(true);
  });
});
