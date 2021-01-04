/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { difference, fromPairs, identity } from 'lodash/fp';
import { useCallback, useMemo } from 'react';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import useMap from 'react-use/lib/useMap';
import { useMessagesStorage } from '../../containers/local_storage/use_messages_storage';
import { CallOutMessage } from './callout_types';

export interface CallOutStorage {
  getVisibleMessageIds: () => string[];
  isVisible: (message: CallOutMessage) => boolean;
  dismiss: (message: CallOutMessage) => void;
}

export const useCallOutStorage = (
  messages: CallOutMessage[],
  namespace: string = 'common'
): CallOutStorage => {
  const { getMessages, addMessage } = useMessagesStorage();

  const visibilityStateInitial = useMemo(() => createInitialVisibilityState(messages), [messages]);
  const [visibilityState, setVisibilityState] = useMap(visibilityStateInitial);

  const dismissedMessagesKey = getDismissedMessagesStorageKey(namespace);

  const getVisibleMessageIds = useCallback(() => {
    return Object.entries(visibilityState)
      .filter(([messageId, isVisible]) => isVisible)
      .map(([messageId, isVisible]) => messageId);
  }, [visibilityState]);

  const isVisible = useCallback(
    (message: CallOutMessage) => {
      return visibilityState[message.id] ?? false;
    },
    [visibilityState]
  );

  const dismiss = useCallback(
    (message: CallOutMessage) => {
      const { id, type } = message;

      // Remember dismissal in memory.
      setVisibilityState.set(id, false);

      // Remember dismissal in local storage for primary and success messages.
      // NOTE: danger and warning ones are not stored!
      if (type === 'primary' || type === 'success') {
        addMessage(dismissedMessagesKey, id);
      }
    },
    [setVisibilityState, addMessage, dismissedMessagesKey]
  );

  useEffectOnce(() => {
    const idsAll = Object.keys(visibilityState);
    const idsDismissed = getMessages(dismissedMessagesKey);
    const idsToMakeVisible = difference(idsAll)(idsDismissed);

    setVisibilityState.setAll({
      ...createVisibilityState(idsToMakeVisible, true),
      ...createVisibilityState(idsDismissed, false),
    });
  });

  return {
    getVisibleMessageIds,
    isVisible,
    dismiss,
  };
};

const getDismissedMessagesStorageKey = (namespace: string) =>
  `kibana.securitySolution.${namespace}.callouts.dismissed`;

const createInitialVisibilityState = (messages: CallOutMessage[]) =>
  createVisibilityState(
    messages.map((m) => m.id),
    false
  );

const createVisibilityState = (messageIds: string[], isVisible: boolean) =>
  mapToObject(messageIds, identity, () => isVisible);

const mapToObject = <T, V>(
  array: T[],
  getKey: (el: T) => string,
  getValue: (el: T) => V
): Record<string, V> => {
  const kvPairs = array.map((el) => [getKey(el), getValue(el)]);
  return fromPairs(kvPairs);
};
