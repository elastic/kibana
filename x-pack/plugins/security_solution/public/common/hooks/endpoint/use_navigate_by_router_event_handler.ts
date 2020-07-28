/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MouseEventHandler, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { LocationDescriptorObject } from 'history';

type EventHandlerCallback = MouseEventHandler<HTMLButtonElement | HTMLAnchorElement>;

/**
 * Provides an event handler that can be used with (for example) `onClick` props to prevent the
 * event's default behaviour and instead navigate to to a route via the Router
 *
 * @param routeTo
 * @param onClick
 */
export const useNavigateByRouterEventHandler = (
  routeTo: string | [string, unknown] | LocationDescriptorObject<unknown>, // Cover the calling signature of `history.push()`

  /** Additional onClick callback */
  onClick?: EventHandlerCallback
): EventHandlerCallback => {
  const history = useHistory();
  return useCallback(
    (ev) => {
      try {
        if (onClick) {
          onClick(ev);
        }
      } catch (error) {
        ev.preventDefault();
        throw error;
      }

      if (ev.defaultPrevented) {
        return;
      }

      if (ev.button !== 0) {
        return;
      }

      if (
        ev.currentTarget instanceof HTMLAnchorElement &&
        ev.currentTarget.target !== '' &&
        ev.currentTarget.target !== '_self'
      ) {
        return;
      }

      if (ev.metaKey || ev.altKey || ev.ctrlKey || ev.shiftKey) {
        return;
      }

      ev.preventDefault();

      if (Array.isArray(routeTo)) {
        history.push(...routeTo);
      } else if (typeof routeTo === 'string') {
        history.push(routeTo);
      } else {
        history.push(routeTo);
      }
    },
    [history, onClick, routeTo]
  );
};
