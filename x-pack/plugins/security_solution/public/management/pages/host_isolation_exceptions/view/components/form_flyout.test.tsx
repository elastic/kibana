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
import userEvent from '@testing-library/user-event';
import { HostIsolationExceptionsFormFlyout } from './form_flyout';
import { act } from 'react-dom/test-utils';
import { HOST_ISOLATION_EXCEPTIONS_PATH } from '../../../../../../common/constants';
import uuid from 'uuid';
import { createEmptyHostIsolationException } from '../../utils';

jest.mock('../../service.ts');
jest.mock('../../../../../common/hooks/use_license');

describe('When on the host isolation exceptions flyout form', () => {
  let mockedContext: AppContextTestRender;
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let waitForAction: AppContextTestRender['middlewareSpy']['waitForAction'];

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    render = () => {
      return mockedContext.render(<HostIsolationExceptionsFormFlyout />);
    };
    waitForAction = mockedContext.middlewareSpy.waitForAction;
  });

  describe('When creating a new exception', () => {
    beforeEach(() => {
      mockedContext.history.push(`${HOST_ISOLATION_EXCEPTIONS_PATH}?show=create`);
    });

    describe('with invalida data', () => {
      it('should show disabled buttons when the form first load', () => {
        renderResult = render();
        expect(renderResult.getByTestId('add-exception-cancel-button')).not.toHaveAttribute(
          'disabled'
        );
        expect(renderResult.getByTestId('add-exception-confirm-button')).toHaveAttribute(
          'disabled'
        );
      });
    });

    describe('with valid data', () => {
      beforeEach(() => {
        renderResult = render();
        const ipInput = renderResult.getByTestId('hostIsolationExceptions-form-ip-input');
        const nameInput = renderResult.getByTestId('hostIsolationExceptions-form-name-input');
        userEvent.type(nameInput, 'test name');
        userEvent.type(ipInput, '10.0.0.1');
      });

      it('should show enable buttons when the form is valid', () => {
        expect(renderResult.getByTestId('add-exception-cancel-button')).not.toHaveAttribute(
          'disabled'
        );
        expect(renderResult.getByTestId('add-exception-confirm-button')).not.toHaveAttribute(
          'disabled'
        );
      });

      it('should submit the entry data when submit is pressed with valid data', async () => {
        const confirmButton = renderResult.getByTestId('add-exception-confirm-button');
        expect(confirmButton).not.toHaveAttribute('disabled');
        const waiter = waitForAction('hostIsolationExceptionsCreateEntry');
        userEvent.click(confirmButton);
        expect(await waiter).toBeTruthy();
      });

      it('should disable the submit button when an operation is in progress', () => {
        act(() => {
          mockedContext.store.dispatch({
            type: 'hostIsolationExceptionsFormStateChanged',
            payload: {
              type: 'LoadingResourceState',
              previousState: { type: 'UninitialisedResourceState' },
            },
          });
        });
        const confirmButton = renderResult.getByTestId('add-exception-confirm-button');
        expect(confirmButton).toHaveAttribute('disabled');
      });

      it('should show a toast and close the flyout when the operation is finished', () => {
        mockedContext.history.push(`${HOST_ISOLATION_EXCEPTIONS_PATH}?show=create`);
        act(() => {
          mockedContext.store.dispatch({
            type: 'hostIsolationExceptionsFormStateChanged',
            payload: {
              type: 'LoadedResourceState',
              previousState: { type: 'UninitialisedResourceState' },
            },
          });
        });
        expect(mockedContext.coreStart.notifications.toasts.addSuccess).toHaveBeenCalled();
        expect(mockedContext.history.location.search).toBe('');
      });

      it('should show an error toast if operation fails and enable the submit button', async () => {
        act(() => {
          mockedContext.store.dispatch({
            type: 'hostIsolationExceptionsFormStateChanged',
            payload: {
              type: 'FailedResourceState',
              error: new Error('mocked error'),
            },
          });
        });
        expect(mockedContext.coreStart.notifications.toasts.addDanger).toHaveBeenCalled();
        const confirmButton = renderResult.getByTestId('add-exception-confirm-button');
        expect(confirmButton).not.toHaveAttribute('disabled');
      });
    });
  });
  describe('When editing an existing exception', () => {
    const fakeId = 'dc5d1d00-2766-11ec-981f-7f84cfc8764f';
    beforeEach(() => {
      mockedContext.history.push(`${HOST_ISOLATION_EXCEPTIONS_PATH}?show=edit&id=${fakeId}`);
    });

    describe('without loaded data', () => {
      it('should show a loading status while the item is loaded', () => {
        renderResult = render();
        expect(renderResult.getByTestId('loading-spinner')).toBeTruthy();
      });

      it('should request to load data about the editing exception', async () => {
        const waiter = waitForAction('hostIsolationExceptionsMarkToEdit', {
          validate: ({ payload }) => {
            return payload.id === fakeId;
          },
        });
        renderResult = render();
        expect(await waiter).toBeTruthy();
      });

      it('should show a warning toast if the item fails to load', () => {
        renderResult = render();
        act(() => {
          mockedContext.store.dispatch({
            type: 'hostIsolationExceptionsFormEntryChanged',
            payload: undefined,
          });

          mockedContext.store.dispatch({
            type: 'hostIsolationExceptionsFormStateChanged',
            payload: {
              type: 'FailedResourceState',
              error: new Error('mocked error'),
            },
          });
        });
        expect(mockedContext.coreStart.notifications.toasts.addWarning).toHaveBeenCalled();
      });
    });

    describe('with loaded data', () => {
      beforeEach(async () => {
        mockedContext.store.dispatch({
          type: 'hostIsolationExceptionsFormEntryChanged',
          payload: {
            ...createEmptyHostIsolationException(),
            name: 'name edit me',
            description: 'initial description',
            id: fakeId,
            item_id: uuid.v4(),
            entries: [
              {
                field: 'destination.ip',
                operator: 'included',
                type: 'match',
                value: '10.0.0.5',
              },
            ],
          },
        });
        renderResult = render();
      });

      it('should request data again if the url id is changed', async () => {
        const otherId = 'd75fbd74-2a92-11ec-8d3d-0242ac130003';
        act(() => {
          mockedContext.history.push(`${HOST_ISOLATION_EXCEPTIONS_PATH}?show=edit&id=${otherId}`);
        });
        await waitForAction('hostIsolationExceptionsMarkToEdit', {
          validate: ({ payload }) => {
            return payload.id === otherId;
          },
        });
      });

      it('should enable the buttons from the start', () => {
        expect(renderResult.getByTestId('add-exception-cancel-button')).not.toHaveAttribute(
          'disabled'
        );
        expect(renderResult.getByTestId('add-exception-confirm-button')).not.toHaveAttribute(
          'disabled'
        );
      });

      it('should submit the entry data when submit is pressed with valid data', async () => {
        const confirmButton = renderResult.getByTestId('add-exception-confirm-button');
        expect(confirmButton).not.toHaveAttribute('disabled');
        const waiter = waitForAction('hostIsolationExceptionsSubmitEdit');
        userEvent.click(confirmButton);
        expect(await waiter).toBeTruthy();
      });
    });
  });
});
