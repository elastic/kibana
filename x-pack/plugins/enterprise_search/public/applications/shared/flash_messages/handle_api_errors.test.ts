/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../__mocks__/kibana_logic.mock';

import { FlashMessagesLogic } from './flash_messages_logic';
import { flashAPIErrors } from './handle_api_errors';

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
      expect(e.message).toEqual('whatever');
      expect(FlashMessagesLogic.actions.setFlashMessages).toHaveBeenCalledWith([
        { type: 'error', message: 'An unexpected error occurred' },
      ]);
    }
  });
});
