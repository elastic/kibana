/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resetContext } from 'kea';

import {
  FlashMessagesLogic,
  setSuccessMessage,
  setErrorMessage,
  setQueuedSuccessMessage,
} from './';

describe('', () => {
  const message = 'I am a message';

  describe('setSuccessMessage()', () => {
    it('sets a success message', () => {
      FlashMessagesLogic.mount();
      setSuccessMessage(message);

      expect(FlashMessagesLogic.values.messages).toEqual([
        {
          message: 'I am a message',
          type: 'success',
        },
      ]);
    });
  });

  describe('setErrorMessage()', () => {
    it('sets an error message', () => {
      FlashMessagesLogic.mount();
      setErrorMessage(message);

      expect(FlashMessagesLogic.values.messages).toEqual([
        {
          message: 'I am a message',
          type: 'error',
        },
      ]);
    });
  });

  describe('setQueuedSuccessMessage()', () => {
    it('sets a queued success message', () => {
      FlashMessagesLogic.mount();
      setQueuedSuccessMessage(message);

      expect(FlashMessagesLogic.values.queuedMessages).toEqual([
        {
          message: 'I am a message',
          type: 'success',
        },
      ]);
    });
  });
});
