/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { difference, fromPairs, identity, intersection, isEqual } from 'lodash/fp';
import { useCallback, useEffect } from 'react';
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

  const [visibilityState, setVisibilityState] = useMap<Record<string, boolean>>({});

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
      // TODO: May need to update this to allow override for warning callouts
      if (type === 'primary' || type === 'success') {
        addMessage(dismissedMessagesKey, id);
      }
    },
    [setVisibilityState, addMessage, dismissedMessagesKey]
  );

  const populateVisibilityState = useCallback(
    (ids: string[]) => {
      const idsDismissed = getMessages(dismissedMessagesKey);
      const idsToShow = difference(ids, idsDismissed);
      const idsToHide = intersection(ids, idsDismissed);

      setVisibilityState.setAll({
        ...createVisibilityState(idsToShow, true),
        ...createVisibilityState(idsToHide, false),
      });
    },
    [getMessages, dismissedMessagesKey, setVisibilityState]
  );

  useEffect(() => {
    const idsFromProps = messages.map((m) => m.id);
    const idsFromState = Object.keys(visibilityState);
    if (!isEqual(idsFromProps, idsFromState)) {
      populateVisibilityState(idsFromProps);
    }
  }, [messages, visibilityState, populateVisibilityState]);

  return {
    getVisibleMessageIds,
    isVisible,
    dismiss,
  };
};

const getDismissedMessagesStorageKey = (namespace: string) =>
  `kibana.securitySolution.${namespace}.callouts.dismissed`;

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
