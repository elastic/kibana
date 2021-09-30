/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from '@testing-library/react';
import { AppContextTestRender, createAppRootMockRenderer } from '../../../../common/mock/endpoint';
import { HOST_ISOLATION_EXCEPTIONS_PATH } from '../../../../../common/constants';
import { HostIsolationExceptionsList } from './host_isolation_exceptions_list';
import { isFailedResourceState, isLoadedResourceState } from '../../../state';
import { getHostIsolationExceptionItems } from '../service';
import { getFoundExceptionListItemSchemaMock } from '../../../../../../lists/common/schemas/response/found_exception_list_item_schema.mock';

jest.mock('../service');
const getHostIsolationExceptionItemsMock = getHostIsolationExceptionItems as jest.Mock;

describe('When on the host isolation exceptions page', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let history: AppContextTestRender['history'];
  let waitForAction: AppContextTestRender['middlewareSpy']['waitForAction'];
  beforeEach(() => {
    getHostIsolationExceptionItemsMock.mockReset();
    const mockedContext = createAppRootMockRenderer();
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
  });
});
