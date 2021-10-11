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

jest.mock('../../service.ts');

describe('When on the host isolation exceptions flyout form', () => {
  let mockedContext: AppContextTestRender;
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let waitForAction: AppContextTestRender['middlewareSpy']['waitForAction'];

  // const createHostIsolationExceptionItemMock = createHostIsolationExceptionItem as jest.mock;

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
        await waiter;
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
      it('should show an error toast operation fails and enable the submit button', () => {
        act(() => {
          mockedContext.store.dispatch({
            type: 'hostIsolationExceptionsFormStateChanged',
            payload: {
              type: 'FailedResourceState',
              previousState: { type: 'UninitialisedResourceState' },
            },
          });
        });
        expect(mockedContext.coreStart.notifications.toasts.addDanger).toHaveBeenCalled();
        const confirmButton = renderResult.getByTestId('add-exception-confirm-button');
        expect(confirmButton).not.toHaveAttribute('disabled');
      });
    });
  });
});
