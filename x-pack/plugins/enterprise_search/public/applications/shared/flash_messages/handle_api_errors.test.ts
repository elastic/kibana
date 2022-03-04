/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('./set_message_helpers', () => ({
  flashErrorToast: jest.fn(),
}));
import '../../__mocks__/kea_logic/kibana_logic.mock';

import { FlashMessagesLogic } from './flash_messages_logic';
import { flashAPIErrors, getErrorsFromHttpResponse, toastAPIErrors } from './handle_api_errors';
import { flashErrorToast } from './set_message_helpers';

describe('flashAPIErrors', () => {
  const mockHttpError = {
    body: {
      statusCode: 404,
      error: 'Not Found',
      message: 'Could not find X,Could not find Y,Something else bad happened',
      attributes: {
        errors: ['Could not find X', 'Could not find Y', 'Something else bad happened'],
      },
    },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    FlashMessagesLogic.mount();
    jest.spyOn(FlashMessagesLogic.actions, 'setFlashMessages');
    jest.spyOn(FlashMessagesLogic.actions, 'setQueuedMessages');
  });

  it('converts API errors into flash messages', () => {
    flashAPIErrors(mockHttpError);

    expect(FlashMessagesLogic.actions.setFlashMessages).toHaveBeenCalledWith([
      { type: 'error', message: 'Could not find X' },
      { type: 'error', message: 'Could not find Y' },
      { type: 'error', message: 'Something else bad happened' },
    ]);
  });

  it('queues messages when isQueued is passed', () => {
    flashAPIErrors(mockHttpError, { isQueued: true });

    expect(FlashMessagesLogic.actions.setQueuedMessages).toHaveBeenCalledWith([
      { type: 'error', message: 'Could not find X' },
      { type: 'error', message: 'Could not find Y' },
      { type: 'error', message: 'Something else bad happened' },
    ]);
  });

  it('falls back to the basic message for http responses without an errors array', () => {
    flashAPIErrors({
      body: {
        statusCode: 404,
        error: 'Not Found',
        message: 'Not Found',
      },
    } as any);

    expect(FlashMessagesLogic.actions.setFlashMessages).toHaveBeenCalledWith([
      { type: 'error', message: 'Not Found' },
    ]);
  });

  it('displays a generic error message and re-throws non-API errors', () => {
    try {
      flashAPIErrors(Error('whatever') as any);
    } catch (e) {
      expect(FlashMessagesLogic.actions.setFlashMessages).toHaveBeenCalledWith([
        { type: 'error', message: expect.any(String) },
      ]);
    }
  });
});

describe('toastAPIErrors', () => {
  const mockHttpError = {
    body: {
      statusCode: 404,
      error: 'Not Found',
      message: 'Could not find X,Could not find Y,Something else bad happened',
      attributes: {
        errors: ['Could not find X', 'Could not find Y', 'Something else bad happened'],
      },
    },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    FlashMessagesLogic.mount();
    jest.spyOn(FlashMessagesLogic.actions, 'setFlashMessages');
    jest.spyOn(FlashMessagesLogic.actions, 'setQueuedMessages');
  });

  it('converts API errors into flash messages', () => {
    toastAPIErrors(mockHttpError);

    expect(flashErrorToast).toHaveBeenNthCalledWith(1, 'Could not find X');
    expect(flashErrorToast).toHaveBeenNthCalledWith(2, 'Could not find Y');
    expect(flashErrorToast).toHaveBeenNthCalledWith(3, 'Something else bad happened');
  });

  it('falls back to the basic message for http responses without an errors array', () => {
    toastAPIErrors({
      body: {
        statusCode: 404,
        error: 'Not Found',
        message: 'Not Found',
      },
    } as any);

    expect(flashErrorToast).toHaveBeenCalledWith('Not Found');
  });

  it('displays a generic error message and re-throws non-API errors', () => {
    const error = Error('whatever');

    expect(() => {
      toastAPIErrors(error as any);
    }).toThrowError(error);

    expect(flashErrorToast).toHaveBeenCalledWith(expect.any(String));
  });
});

describe('getErrorsFromHttpResponse', () => {
  it('should return errors from the response if present', () => {
    expect(
      getErrorsFromHttpResponse({
        body: { attributes: { errors: ['first error', 'second error'] } },
      } as any)
    ).toEqual(['first error', 'second error']);
  });

  it('should return a message from the responnse if no errors', () => {
    expect(getErrorsFromHttpResponse({ body: { message: 'test message' } } as any)).toEqual([
      'test message',
    ]);
  });

  it('should return the a default message otherwise', () => {
    expect(getErrorsFromHttpResponse({} as any)).toEqual([expect.any(String)]);
  });
});
