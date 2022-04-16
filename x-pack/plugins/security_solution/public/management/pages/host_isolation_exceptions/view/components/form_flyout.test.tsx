/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import uuid from 'uuid';
import {
  AppContextTestRender,
  createAppRootMockRenderer,
} from '../../../../../common/mock/endpoint';
import { getHostIsolationExceptionsListPath } from '../../../../common/routing';
import { sendGetEndpointSpecificPackagePolicies } from '../../../../services/policies/policies';
import { sendGetEndpointSpecificPackagePoliciesMock } from '../../../../services/policies/test_mock_utils';
import {
  createHostIsolationExceptionItem,
  getOneHostIsolationExceptionItem,
  updateOneHostIsolationExceptionItem,
} from '../../service';
import { createEmptyHostIsolationException } from '../../utils';
import { HostIsolationExceptionsFormFlyout } from './form_flyout';

jest.mock('../../service');
jest.mock('../../../../../common/hooks/use_license');
jest.mock('../../../../services/policies/policies');

const createHostIsolationExceptionItemMock = createHostIsolationExceptionItem as jest.Mock;
const updateOneHostIsolationExceptionItemMock = updateOneHostIsolationExceptionItem as jest.Mock;
const getOneHostIsolationExceptionItemMock = getOneHostIsolationExceptionItem as jest.Mock;
(sendGetEndpointSpecificPackagePolicies as jest.Mock).mockImplementation(
  sendGetEndpointSpecificPackagePoliciesMock
);

describe('When on the host isolation exceptions flyout form', () => {
  let mockedContext: AppContextTestRender;
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let onCancel: () => void;

  beforeEach(async () => {
    onCancel = jest.fn();
    mockedContext = createAppRootMockRenderer();
    mockedContext.history.push(getHostIsolationExceptionsListPath({ show: 'create' }));

    createHostIsolationExceptionItemMock.mockReset();
    updateOneHostIsolationExceptionItemMock.mockReset();
    getOneHostIsolationExceptionItemMock.mockReset();
  });

  describe('When creating a new exception', () => {
    beforeEach(() => {
      render = () => {
        return mockedContext.render(<HostIsolationExceptionsFormFlyout onCancel={onCancel} />);
      };
    });
    describe('with invalid data', () => {
      beforeEach(async () => {
        renderResult = render();
        await waitForElementToBeRemoved(renderResult.queryByTestId('loading-spinner'));
      });

      it('should show disabled buttons when the form first load', async () => {
        expect(renderResult.getByTestId('add-exception-cancel-button')).not.toHaveAttribute(
          'disabled'
        );
        expect(renderResult.getByTestId('add-exception-confirm-button')).toHaveAttribute(
          'disabled'
        );
      });

      it('should disable submit if the data is invalid', async () => {
        const ipInput = renderResult.getByTestId('hostIsolationExceptions-form-ip-input');
        const nameInput = renderResult.getByTestId('hostIsolationExceptions-form-name-input');
        const confirmButton = renderResult.getByTestId('add-exception-confirm-button');
        userEvent.type(nameInput, 'test name');
        userEvent.clear(ipInput);
        userEvent.type(ipInput, 'not an ip');
        expect(confirmButton).toHaveAttribute('disabled');
      });

      it('should call onCancel when cancel is pressed', async () => {
        const cancelButton = renderResult.getByTestId('add-exception-cancel-button');
        userEvent.click(cancelButton);
        expect(onCancel).toHaveBeenCalled();
      });
    });

    describe('with valid data', () => {
      beforeEach(async () => {
        renderResult = render();
        await waitForElementToBeRemoved(renderResult.queryByTestId('loading-spinner'));

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
        userEvent.click(confirmButton);
        await waitFor(() => {
          expect(createHostIsolationExceptionItemMock).toHaveBeenCalled();
        });
      });

      it('should disable the submit button when an operation is in progress', async () => {
        // simulate a pending request
        createHostIsolationExceptionItemMock.mockImplementationOnce(() => {
          return new Promise((resolve) => {
            setTimeout(resolve, 300);
          });
        });
        const confirmButton = renderResult.getByTestId('add-exception-confirm-button');
        expect(confirmButton).not.toHaveAttribute('disabled');
        userEvent.click(confirmButton);
        await waitFor(() => {
          expect(createHostIsolationExceptionItemMock).toHaveBeenCalled();
          expect(confirmButton).toHaveAttribute('disabled');
        });
      });

      it('should show a toast and close the flyout when the operation is finished calling onCancel', async () => {
        const confirmButton = renderResult.getByTestId('add-exception-confirm-button');
        userEvent.click(confirmButton);
        await waitFor(() => {
          expect(mockedContext.coreStart.notifications.toasts.addSuccess).toHaveBeenCalled();
          expect(onCancel).toHaveBeenCalled();
        });
      });

      it('should show an error toast if operation fails and enable the submit button', async () => {
        createHostIsolationExceptionItemMock.mockRejectedValue(new Error('not valid'));
        const confirmButton = renderResult.getByTestId('add-exception-confirm-button');
        userEvent.click(confirmButton);
        await waitFor(() => {
          expect(mockedContext.coreStart.notifications.toasts.addDanger).toHaveBeenCalledWith(
            'There was an error creating the exception: "not valid"'
          );
          expect(confirmButton).not.toHaveAttribute('disabled');
        });
      });
    });
  });

  describe('When editing an existing exception', () => {
    const fakeId = uuid.v4();
    beforeEach(() => {
      mockedContext.history.push(getHostIsolationExceptionsListPath({ show: 'edit', id: fakeId }));
      render = () => {
        return mockedContext.render(
          <HostIsolationExceptionsFormFlyout id={fakeId} onCancel={onCancel} />
        );
      };
    });

    describe('without loaded data', () => {
      it('should show a loading status while the item is loaded', () => {
        renderResult = render();
        expect(renderResult.getByTestId('loading-spinner')).toBeTruthy();
      });

      it('should request to load data about the editing exception', async () => {
        renderResult = render();
        await waitFor(() => {
          expect(getOneHostIsolationExceptionItemMock).toHaveBeenCalledWith(
            mockedContext.coreStart.http,
            fakeId
          );
        });
      });
    });

    describe('with loaded data', () => {
      beforeEach(async () => {
        getOneHostIsolationExceptionItemMock.mockReturnValueOnce({
          ...createEmptyHostIsolationException(),
          name: 'name edit me',
          description: 'initial description',
          id: fakeId,
          item_id: fakeId,
          entries: [
            {
              field: 'destination.ip',
              operator: 'included',
              type: 'match',
              value: '10.0.0.5',
            },
          ],
        });
        renderResult = render();
        await waitForElementToBeRemoved(renderResult.queryByTestId('loading-spinner'));
      });

      it('should enable the buttons after data is loaded', () => {
        expect(renderResult.getByTestId('add-exception-cancel-button')).not.toHaveAttribute(
          'disabled'
        );
        expect(renderResult.getByTestId('add-exception-confirm-button')).not.toHaveAttribute(
          'disabled'
        );
      });

      it('should disable submit if the data is invalid', async () => {
        const ipInput = renderResult.getByTestId('hostIsolationExceptions-form-ip-input');
        const nameInput = renderResult.getByTestId('hostIsolationExceptions-form-name-input');
        const confirmButton = renderResult.getByTestId('add-exception-confirm-button');
        userEvent.type(nameInput, 'test name');
        userEvent.clear(ipInput);
        userEvent.type(ipInput, 'not an ip');
        expect(confirmButton).toHaveAttribute('disabled');
      });

      it('should submit the entry data when submit is pressed with valid data', async () => {
        const confirmButton = renderResult.getByTestId('add-exception-confirm-button');
        expect(confirmButton).not.toHaveAttribute('disabled');
        userEvent.click(confirmButton);
        await waitFor(() => {
          expect(updateOneHostIsolationExceptionItemMock).toHaveBeenCalledWith(
            mockedContext.coreStart.http,
            {
              comments: [],
              description: 'initial description',
              entries: [
                { field: 'destination.ip', operator: 'included', type: 'match', value: '10.0.0.5' },
              ],
              id: fakeId,
              item_id: fakeId,
              list_id: 'endpoint_host_isolation_exceptions',
              name: 'name edit me',
              namespace_type: 'agnostic',
              os_types: ['windows', 'linux', 'macos'],
              tags: ['policy:all'],
              type: 'simple',
            }
          );
        });
        expect(confirmButton).toHaveAttribute('disabled');
      });

      it('should call onCancel when cancel is pressed', async () => {
        const cancelButton = renderResult.getByTestId('add-exception-cancel-button');
        userEvent.click(cancelButton);
        expect(onCancel).toHaveBeenCalled();
      });
    });
  });
});
