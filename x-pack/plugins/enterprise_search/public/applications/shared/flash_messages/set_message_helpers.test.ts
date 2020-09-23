/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mockHistory } from '../../__mocks__';

import {
  FlashMessagesLogic,
  mountFlashMessagesLogic,
  setSuccessMessage,
  setErrorMessage,
  setQueuedSuccessMessage,
} from './';

describe('Flash Message Helpers', () => {
  const message = 'I am a message';

  beforeEach(() => {
    mountFlashMessagesLogic({ history: mockHistory as any });
  });

  it('setSuccessMessage()', () => {
    setSuccessMessage(message);

    expect(FlashMessagesLogic.values.messages).toEqual([
      {
        message,
        type: 'success',
      },
    ]);
  });

  it('setErrorMessage()', () => {
    setErrorMessage(message);

    expect(FlashMessagesLogic.values.messages).toEqual([
      {
        message,
        type: 'error',
      },
    ]);
  });

  it('setQueuedSuccessMessage()', () => {
    setQueuedSuccessMessage(message);

    expect(FlashMessagesLogic.values.queuedMessages).toEqual([
      {
        message,
        type: 'success',
      },
    ]);
  });
});
