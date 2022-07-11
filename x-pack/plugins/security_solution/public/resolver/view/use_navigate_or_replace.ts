/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MouseEventHandler } from 'react';
import { useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import type { LocationDescriptorObject } from 'history';

type EventHandlerCallback = MouseEventHandler<HTMLButtonElement | HTMLAnchorElement>;

export function useNavigateOrReplace(
  to: LocationDescriptorObject<unknown>,
  /** Additional onClick callback */
  additionalOnClick?: EventHandlerCallback
): { href: string; onClick: EventHandlerCallback } {
  const history = useHistory();
  const onClick = useCallback(
    (event) => {
      try {
        if (additionalOnClick) {
          additionalOnClick(event);
        }
      } catch (error) {
        event.preventDefault();
        throw error;
      }

      if (event.defaultPrevented) {
        return;
      }

      if (event.button !== 0) {
        return;
      }

      if (
        event.currentTarget instanceof HTMLAnchorElement &&
        event.currentTarget.target !== '' &&
        event.currentTarget.target !== '_self'
      ) {
        return;
      }

      if (event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) {
        return;
      }

      event.preventDefault();
      history.push(to);
    },
    [history, additionalOnClick, to]
  );
  return {
    href: history.createHref(to),
    onClick,
  };
}
