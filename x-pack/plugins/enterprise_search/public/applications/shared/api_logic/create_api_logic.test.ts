/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter, mockFlashMessageHelpers } from '../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { HttpError, Status } from '../../../../common/types/api';

import { createApiLogic } from './create_api_logic';

const DEFAULT_VALUES = {
  apiStatus: {
    status: Status.IDLE,
  },
  data: undefined,
  error: undefined,
  status: Status.IDLE,
};

describe('CreateApiLogic', () => {
  const apiCallMock = jest.fn();
  const logic = createApiLogic(['path'], apiCallMock);
  const { mount } = new LogicMounter(logic);
  const { clearFlashMessages, flashSuccessToast, flashAPIErrors } = mockFlashMessageHelpers;

  beforeEach(() => {
    jest.clearAllMocks();
    mount({});
  });

  it('has expected default values', () => {
    expect(logic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('makeRequest', () => {
      it('should set status to LOADING', () => {
        logic.actions.makeRequest({});
        expect(logic.values).toEqual({
          ...DEFAULT_VALUES,
          apiStatus: { status: Status.LOADING },
          status: Status.LOADING,
        });
        expect(clearFlashMessages).toHaveBeenCalled();
      });

      it('should set persist data in between new requests', () => {
        logic.actions.apiSuccess(123);
        logic.actions.makeRequest({});
        expect(logic.values).toEqual({
          ...DEFAULT_VALUES,
          apiStatus: { data: 123, status: Status.LOADING },
          data: 123,
          status: Status.LOADING,
        });
      });

      it('should not call clearFlashMessages if clearFlashMessages param is false', () => {
        const messageLogic = createApiLogic(['message_path'], apiCallMock, {
          clearFlashMessagesOnMakeRequest: false,
        });
        const { mount: messageMount } = messageLogic;
        messageMount();
        messageLogic.actions.makeRequest({});
        expect(clearFlashMessages).not.toHaveBeenCalled();
      });
    });
    describe('apiSuccess', () => {
      it('should set status to SUCCESS and load data', () => {
        logic.actions.apiSuccess({ success: 'data' });
        expect(logic.values).toEqual({
          ...DEFAULT_VALUES,
          apiStatus: {
            data: { success: 'data' },
            status: Status.SUCCESS,
          },
          data: { success: 'data' },
          status: Status.SUCCESS,
        });
        expect(flashSuccessToast).not.toHaveBeenCalled();
      });
      it('should call flashSuccessToast if success function provided', () => {
        const messageLogic = createApiLogic(['message_path'], apiCallMock, {
          showSuccessFlashFn: () => 'test message',
        });
        const { mount: messageMount } = messageLogic;
        messageMount();
        messageLogic.actions.apiSuccess({});
        expect(flashSuccessToast).toHaveBeenCalledWith('test message');
      });
    });
    describe('apiError', () => {
      it('should set status to ERROR and set error data', () => {
        logic.actions.apiError('error' as any as HttpError);
        expect(logic.values).toEqual({
          ...DEFAULT_VALUES,
          apiStatus: {
            data: undefined,
            error: 'error',
            status: Status.ERROR,
          },
          data: undefined,
          error: 'error',
          status: Status.ERROR,
        });
        expect(flashAPIErrors).toHaveBeenCalledWith('error');
      });
      it('should not call flashApiErrors if showErrorFlash param is set to false', () => {
        const messageLogic = createApiLogic(['message_path'], apiCallMock, {
          showErrorFlash: false,
        });
        const { mount: messageMount } = messageLogic;
        messageMount();
        messageLogic.actions.apiError('error' as any as HttpError);
        expect(flashAPIErrors).not.toHaveBeenCalledWith('error');
      });
    });
    describe('apiReset', () => {
      it('should reset api', () => {
        logic.actions.apiError('error' as any as HttpError);
        expect(logic.values).toEqual({
          ...DEFAULT_VALUES,
          apiStatus: {
            data: undefined,
            error: 'error',
            status: Status.ERROR,
          },
          data: undefined,
          error: 'error',
          status: Status.ERROR,
        });
        logic.actions.apiReset();
        expect(logic.values).toEqual(DEFAULT_VALUES);
      });
    });
  });

  describe('listeners', () => {
    describe('makeRequest', () => {
      it('calls apiCall on success', async () => {
        const apiSuccessMock = jest.spyOn(logic.actions, 'apiSuccess');
        const apiErrorMock = jest.spyOn(logic.actions, 'apiError');
        apiCallMock.mockReturnValue(Promise.resolve('result'));
        logic.actions.makeRequest({ arg: 'argument1' });
        expect(apiCallMock).toHaveBeenCalledWith({ arg: 'argument1' });
        await nextTick();
        expect(apiErrorMock).not.toHaveBeenCalled();
        expect(apiSuccessMock).toHaveBeenCalledWith('result');
      });
      it('calls apiError on error', async () => {
        const apiSuccessMock = jest.spyOn(logic.actions, 'apiSuccess');
        const apiErrorMock = jest.spyOn(logic.actions, 'apiError');
        apiCallMock.mockReturnValue(
          Promise.reject({
            body: {
              message: 'message',
              statusCode: 404,
            },
          })
        );
        logic.actions.makeRequest({ arg: 'argument1' });
        expect(apiCallMock).toHaveBeenCalledWith({ arg: 'argument1' });
        await nextTick();
        expect(apiSuccessMock).not.toHaveBeenCalled();
        expect(apiErrorMock).toHaveBeenCalledWith({
          body: { message: 'message', statusCode: 404 },
        });
      });
    });
  });
});
