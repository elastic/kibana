/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { useValues, useActions } from 'kea';
import { History } from 'history';

import { FlashMessagesLogic } from './flash_messages_logic';

interface IFlashMessagesProviderProps {
  history: History;
}

export const FlashMessagesProvider: React.FC<IFlashMessagesProviderProps> = ({ history }) => {
  const { historyListener } = useValues(FlashMessagesLogic);
  const { listenToHistory } = useActions(FlashMessagesLogic);

  useEffect(() => {
    if (!historyListener) listenToHistory(history);
  }, []);

  return null;
};
