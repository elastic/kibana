/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter, mockFlashMessageHelpers } from '../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { createApiLogic } from './create_api_logic';

const DEFAULT_VALUES = {
  apiStatus: {
    status: 'IDLE',
  },
  data: undefined,
  error: undefined,
  status: 'IDLE',
};

describe('CreateApiLogic', () => {
  const apiCallMock = jest.fn();
  const logic = createApiLogic(['path'], apiCallMock);
  const { mount } = new LogicMounter(logic);
  const { clearFlashMessages, flashAPIErrors } = mockFlashMessageHelpers;

  beforeEach(() => {
    jest.clearAllMocks();
    mount({});
  });

  it('has expected default values', () => {
    expect(logic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('initiateCall', () => {
      it('should set status to LOADING', () => {
        logic.actions.initiateCall({});
        expect(logic.values).toEqual({
          ...DEFAULT_VALUES,
          status: 'LOADING',
          apiStatus: {
            status: 'LOADING',
          },
        });
      });
    });
    describe('apiSuccess', () => {
      it('should set status to SUCCESS and load data', () => {
        logic.actions.apiSuccess({ success: 'data' });
        expect(logic.values).toEqual({
          ...DEFAULT_VALUES,
          status: 'SUCCESS',
          data: { success: 'data' },
          apiStatus: {
            status: 'SUCCESS',
            data: { success: 'data' },
          },
        });
      });
    });
    describe('apiError', () => {
      it('should set status to ERROR and set error data', () => {
        logic.actions.apiError(404, 'message');
        expect(logic.values).toEqual({
          ...DEFAULT_VALUES,
          status: 'ERROR',
          data: undefined,
          error: {
            code: 404,
            error: 'message',
          },
          apiStatus: {
            status: 'ERROR',
            data: undefined,
            error: {
              code: 404,
              error: 'message',
            },
          },
        });
      });
    });
    describe('apiReset', () => {
      it('should reset api', () => {
        logic.actions.apiError(404, 'message');
        expect(logic.values).toEqual({
          ...DEFAULT_VALUES,
          status: 'ERROR',
          data: undefined,
          error: {
            code: 404,
            error: 'message',
          },
          apiStatus: {
            status: 'ERROR',
            data: undefined,
            error: {
              code: 404,
              error: 'message',
            },
          },
        });
        logic.actions.apiReset();
        expect(logic.values).toEqual(DEFAULT_VALUES);
      });
    });
  });

  describe('listeners', () => {
    describe('initiateCall', () => {
      it('calls apiCall on success', async () => {
        const apiSuccessMock = jest.spyOn(logic.actions, 'apiSuccess');
        const apiErrorMock = jest.spyOn(logic.actions, 'apiError');
        apiCallMock.mockReturnValue(Promise.resolve('result'));
        logic.actions.initiateCall({ arg: 'argument1' });
        expect(apiCallMock).toHaveBeenCalledWith({ arg: 'argument1' });
        await nextTick();
        expect(apiErrorMock).not.toHaveBeenCalled();
        expect(apiSuccessMock).toHaveBeenCalledWith('result');
        expect(clearFlashMessages).toHaveBeenCalled();
      });
      it('calls apiError on error', async () => {
        const apiSuccessMock = jest.spyOn(logic.actions, 'apiSuccess');
        const apiErrorMock = jest.spyOn(logic.actions, 'apiError');
        apiCallMock.mockReturnValue(
          Promise.reject({ body: { statusCode: 404, message: 'message' } })
        );
        logic.actions.initiateCall({ arg: 'argument1' });
        expect(apiCallMock).toHaveBeenCalledWith({ arg: 'argument1' });
        await nextTick();
        expect(apiSuccessMock).not.toHaveBeenCalled();
        expect(apiErrorMock).toHaveBeenCalledWith(404, 'message');
        expect(flashAPIErrors).toHaveBeenCalledWith({
          body: { statusCode: 404, message: 'message' },
        });
      });
    });
  });
});
