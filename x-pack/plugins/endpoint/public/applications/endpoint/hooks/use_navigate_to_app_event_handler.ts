/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SyntheticEvent, useMemo } from 'react';
import { ApplicationStart } from 'kibana/public';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';

type NavigateToAppHandlerProps = Parameters<ApplicationStart['navigateToApp']>;

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
 * const handleOnClick = useNavigateToAppEventHandler('ingestManager', {path: '#/configs'})
 * return <EuiLink onClick={handleOnClick}>See configs</EuiLink>
 */
export const useNavigateToAppEventHandler = (
  appId: NavigateToAppHandlerProps[0],
  options?: NavigateToAppHandlerProps[1]
): ((ev: SyntheticEvent) => void) => {
  const { services } = useKibana();
  const { path, state } = options || {};
  return useMemo(() => {
    return (ev: SyntheticEvent) => {
      ev.preventDefault();
      services.application.navigateToApp(appId, { path, state });
    };
  }, [appId, path, services.application, state]);
};
