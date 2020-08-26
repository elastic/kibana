/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MouseEventHandler, useCallback } from 'react';
import { ApplicationStart, NavigateToAppOptions } from 'kibana/public';
import { useKibana } from '../../lib/kibana';

type NavigateToAppHandlerOptions<S = unknown> = NavigateToAppOptions & {
  state?: S;
  onClick?: EventHandlerCallback;
};
type EventHandlerCallback = MouseEventHandler<HTMLButtonElement | HTMLAnchorElement>;

/**
 * Provides an event handlers that can be used with (for example) `onClick` to prevent the
 * event's default behaviour and instead use Kibana's `navigateToApp()` to send user to a
 * different app. Use of `navigateToApp()` prevents a full browser refresh for apps that have
 * been converted to the New Platform.
 *
 * @param appId
 * @param [options]
 *
 * @example
 *
 * const handleOnClick = useNavigateToAppEventHandler('ingestManager', {path: '#/policies'})
 * return <EuiLink onClick={handleOnClick}>See policies</EuiLink>
 */
export const useNavigateToAppEventHandler = <S = unknown>(
  /** the app id - normally the value of the `id` in that plugin's `kibana.json`  */
  appId: Parameters<ApplicationStart['navigateToApp']>[0],

  /** Options, some of which are passed along to the app route */
  options?: NavigateToAppHandlerOptions<S>
): EventHandlerCallback => {
  const { services } = useKibana();
  const { path, state, onClick } = options || {};
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
      services.application.navigateToApp(appId, { path, state });
    },
    [appId, onClick, path, services.application, state]
  );
};
