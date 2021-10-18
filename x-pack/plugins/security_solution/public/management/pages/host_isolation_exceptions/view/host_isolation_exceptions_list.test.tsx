/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { getFoundExceptionListItemSchemaMock } from '../../../../../../lists/common/schemas/response/found_exception_list_item_schema.mock';
import { HOST_ISOLATION_EXCEPTIONS_PATH } from '../../../../../common/constants';
import { AppContextTestRender, createAppRootMockRenderer } from '../../../../common/mock/endpoint';
import { isFailedResourceState, isLoadedResourceState } from '../../../state';
import { getHostIsolationExceptionItems } from '../service';
import { HostIsolationExceptionsList } from './host_isolation_exceptions_list';
import { useLicense } from '../../../../common/hooks/use_license';

jest.mock('../../../../common/components/user_privileges/endpoint/use_endpoint_privileges');
jest.mock('../service');
jest.mock('../../../../common/hooks/use_license');

const getHostIsolationExceptionItemsMock = getHostIsolationExceptionItems as jest.Mock;

describe('When on the host isolation exceptions page', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let history: AppContextTestRender['history'];
  let waitForAction: AppContextTestRender['middlewareSpy']['waitForAction'];
  let mockedContext: AppContextTestRender;

  const isPlatinumPlusMock = useLicense().isPlatinumPlus as jest.Mock;

  beforeEach(() => {
    getHostIsolationExceptionItemsMock.mockReset();
    mockedContext = createAppRootMockRenderer();
    ({ history } = mockedContext);
    render = () => (renderResult = mockedContext.render(<HostIsolationExceptionsList />));
    waitForAction = mockedContext.middlewareSpy.waitForAction;

    act(() => {
      history.push(HOST_ISOLATION_EXCEPTIONS_PATH);
    });
  });
  describe('When on the host isolation list page', () => {
    const dataReceived = () =>
      act(async () => {
        await waitForAction('hostIsolationExceptionsPageDataChanged', {
          validate(action) {
            return isLoadedResourceState(action.payload);
          },
        });
      });
    describe('And no data exists', () => {
      beforeEach(async () => {
        getHostIsolationExceptionItemsMock.mockReturnValue({
          data: [],
          page: 1,
          per_page: 10,
          total: 0,
        });
      });

      it('should show the Empty message', async () => {
        render();
        await dataReceived();
        expect(renderResult.getByTestId('hostIsolationExceptionsEmpty')).toBeTruthy();
      });

      it('should not display the search bar', async () => {
        render();
        await dataReceived();
        expect(renderResult.queryByTestId('searchExceptions')).toBeFalsy();
      });
    });
    describe('And data exists', () => {
      beforeEach(async () => {
        getHostIsolationExceptionItemsMock.mockImplementation(getFoundExceptionListItemSchemaMock);
      });

      it('should show loading indicator while retrieving data', async () => {
        let releaseApiResponse: (value?: unknown) => void;

        getHostIsolationExceptionItemsMock.mockReturnValue(
          new Promise((resolve) => (releaseApiResponse = resolve))
        );
        render();

        expect(renderResult.getByTestId('hostIsolationExceptionsContent-loader')).toBeTruthy();

        const wasReceived = dataReceived();
        releaseApiResponse!();
        await wasReceived;
        expect(renderResult.container.querySelector('.euiProgress')).toBeNull();
      });

      it('should display the search bar', async () => {
        render();
        await dataReceived();
        expect(renderResult.getByTestId('searchExceptions')).toBeTruthy();
      });

      it('should show items on the list', async () => {
        render();
        await dataReceived();

        expect(renderResult.getByTestId('hostIsolationExceptionsCard')).toBeTruthy();
      });

      it('should show API error if one is encountered', async () => {
        getHostIsolationExceptionItemsMock.mockImplementation(() => {
          throw new Error('Server is too far away');
        });
        const errorDispatched = act(async () => {
          await waitForAction('hostIsolationExceptionsPageDataChanged', {
            validate(action) {
              return isFailedResourceState(action.payload);
            },
          });
        });
        render();
        await errorDispatched;
        expect(
          renderResult.getByTestId('hostIsolationExceptionsContent-error').textContent
        ).toEqual(' Server is too far away');
      });
    });

    describe('is license platinum plus', () => {
      beforeEach(() => {
        isPlatinumPlusMock.mockReturnValue(true);
      });
      it('should show the create flyout when the add button is pressed', () => {
        render();
        act(() => {
          userEvent.click(renderResult.getByTestId('hostIsolationExceptionsListAddButton'));
        });
        expect(renderResult.getByTestId('hostIsolationExceptionsCreateEditFlyout')).toBeTruthy();
      });
      it('should show the create flyout when the show location is create', () => {
        history.push(`${HOST_ISOLATION_EXCEPTIONS_PATH}?show=create`);
        render();
        expect(renderResult.getByTestId('hostIsolationExceptionsCreateEditFlyout')).toBeTruthy();
        expect(renderResult.queryByTestId('hostIsolationExceptionsCreateEditFlyout')).toBeTruthy();
      });
    });

    describe('is not license platinum plus', () => {
      beforeEach(() => {
        isPlatinumPlusMock.mockReturnValue(false);
      });
      it('should not show the create flyout if the user navigates to the create url', () => {
        history.push(`${HOST_ISOLATION_EXCEPTIONS_PATH}?show=create`);
        render();
        expect(renderResult.queryByTestId('hostIsolationExceptionsCreateEditFlyout')).toBeFalsy();
      });
      it('should not show the create flyout if the user navigates to the edit url', () => {
        history.push(`${HOST_ISOLATION_EXCEPTIONS_PATH}?show=edit`);
        render();
        expect(renderResult.queryByTestId('hostIsolationExceptionsCreateEditFlyout')).toBeFalsy();
      });
    });
  });
});
