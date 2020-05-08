/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useSelector } from 'react-redux';
import { useMemo, useContext } from 'react';
import { Immutable } from '../../../../../common/types';
import { HostState } from '../../types';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { hostsSelectorContext } from '../../hosts';

export function useHostSelector<TSelected>(
  selector: (
    state: Immutable<HostState>
  ) => TSelected extends Immutable<TSelected> ? TSelected : never
) {
  const substate = useContext(hostsSelectorContext);
  const globalState = useSelector((state: HostState) => state);
  return useMemo(() => {
    if (substate === undefined) {
      return selector(globalState);
    }
    return selector(substate);
  }, [substate, globalState, selector]);
}

/**
 * Returns an object that contains Kibana Logs app and URL information for a given host id
 * @param hostId
 */
export const useHostLogsUrl = (hostId: string): { url: string; appId: string; appPath: string } => {
  const { services } = useKibana();
  return useMemo(() => {
    const appPath = `/stream?logFilter=(expression:'host.id:${hostId}',kind:kuery)`;
    return {
      url: `${services.application.getUrlForApp('logs')}${appPath}`,
      appId: 'logs',
      appPath,
    };
  }, [hostId, services.application]);
};
