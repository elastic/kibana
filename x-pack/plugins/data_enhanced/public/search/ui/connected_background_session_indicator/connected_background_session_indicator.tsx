/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { debounceTime } from 'rxjs/operators';
import useObservable from 'react-use/lib/useObservable';
import { BackgroundSessionIndicator } from '../background_session_indicator';
import { ISessionService } from '../../../../../../../src/plugins/data/public/';
import { RedirectAppLinks } from '../../../../../../../src/plugins/kibana_react/public';
import { ApplicationStart } from '../../../../../../../src/core/public';

export interface BackgroundSessionIndicatorDeps {
  sessionService: ISessionService;
  application: ApplicationStart;
}

export const createConnectedBackgroundSessionIndicator = ({
  sessionService,
  application,
}: BackgroundSessionIndicatorDeps): React.FC => {
  return () => {
    const state = useObservable(sessionService.state$.pipe(debounceTime(500)));
    if (!state) return null;
    return (
      <RedirectAppLinks application={application}>
        <BackgroundSessionIndicator
          state={state}
          onContinueInBackground={() => {
            sessionService.save();
          }}
          onSaveResults={() => {
            sessionService.save();
          }}
          onRefresh={() => {
            sessionService.refresh();
          }}
          onCancel={() => {
            sessionService.cancel();
          }}
        />
      </RedirectAppLinks>
    );
  };
};
