/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import useObservable from 'react-use/lib/useObservable';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { BackgroundSearchIndicator } from './background_session_indicator';
import { DataPublicPluginStart } from '../../../../../src/plugins/data/public/';
import { BackgroundSessionViewState } from './background_session_state';

export interface BackgroundSessionIndicatorDeps {
  sessionService: DataPublicPluginStart['search']['session'];
}

export const createConnectedBackgroundSessionIndicator = ({
  sessionService,
}: BackgroundSessionIndicatorDeps): React.FC => {
  const sessionId$ = sessionService.getSession$();
  const isSession$ = sessionId$.pipe(
    map((sessionId) => !!sessionId),
    distinctUntilChanged()
  );

  return () => {
    const isSession = useObservable(isSession$, !!sessionService.getSessionId());
    if (!isSession) return null;
    return <BackgroundSearchIndicator state={BackgroundSessionViewState.Loading} />;
  };
};
