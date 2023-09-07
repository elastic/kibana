/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';

import type { Conversation } from '@kbn/elastic-assistant';
import { useKibana } from '../../common/lib/kibana';

interface Props {
  defaultValue: Conversation[];
}

/** Reads and writes settings from local storage */
export const useEsStorage = ({
  defaultValue,
}: Props): [
  Conversation[],
  (conversations: Conversation[]) => void,
  (conversation: Conversation) => void
] => {
  const { http } = useKibana().services;
  const [initialized, setInitialized] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [_value, _setValue] = useState(defaultValue);

  const getMessages = useCallback(async () => {
    setIsLoading(true);
    try {
      return await http.fetch<{ conversations: Conversation[] }>(
        `/internal/elastic_assistant/store`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          version: '2023-10-31',
        }
      );
    } finally {
      setIsLoading(false);
    }
  }, [http]);

  const postMessages = useCallback(
    async (messages?: Conversation[] = defaultValue) => {
      setIsLoading(true);
      try {
        return await http.fetch<{ conversations: Conversation[] }>(
          `/internal/elastic_assistant/store`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            version: '2023-10-31',
            body: JSON.stringify(messages),
          }
        );
      } finally {
        setIsLoading(false);
      }
    },
    [defaultValue, http]
  );

  const getValueFromEs = useCallback(async () => {
    let value = await getMessages();
    if (value.conversations.length === 0) {
      value = await postMessages();
    }
    console.log('value', value);

    _setValue(value.conversations);
  }, [getMessages, postMessages]);

  // const setValue = useCallback(
  //   (value: T | ((prev: T) => T)) => {
  //     if (typeof value === 'function') {
  //       const updater = value as (prev: T) => T;
  //       _setValue((prevValue) => {
  //         const newValue = updater(prevValue);
  //         storage.set(`${plugin}.${key}`, newValue);
  //         return newValue;
  //       });
  //     } else {
  //       storage.set(`${plugin}.${key}`, value);
  //       _setValue(value);
  //     }
  //   },
  //   [key, plugin, storage]
  // );

  useEffect(() => {
    if (!initialized) {
      getValueFromEs();
      setInitialized(true);
    }
  }, [initialized, getValueFromEs]);

  return [_value, () => {}, setInitialized];
};
