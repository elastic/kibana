/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import useObservable from 'react-use/lib/useObservable';
import { i18n } from '@kbn/i18n';
import { BackgroundSessionIndicator } from '../background_session_indicator';
import { ISessionService, TimefilterContract } from '../../../../../../../src/plugins/data/public/';
import { RedirectAppLinks } from '../../../../../../../src/plugins/kibana_react/public';
import { ApplicationStart } from '../../../../../../../src/core/public';

export interface BackgroundSessionIndicatorDeps {
  sessionService: ISessionService;
  timeFilter: TimefilterContract;
  application: ApplicationStart;
}

export const createConnectedBackgroundSessionIndicator = ({
  sessionService,
  application,
  timeFilter,
}: BackgroundSessionIndicatorDeps): React.FC => {
  const isAutoRefreshEnabled = () => !timeFilter.getRefreshInterval().pause;
  const isAutoRefreshEnabled$ = timeFilter
    .getRefreshIntervalUpdate$()
    .pipe(map(isAutoRefreshEnabled), distinctUntilChanged());

  const getCapabilitiesByAppId = (
    capabilities: ApplicationStart['capabilities'],
    appId?: string
  ) => {
    switch (appId) {
      case 'dashboards':
        return capabilities.dashboard;
      case 'discover':
        return capabilities.discover;
      default:
        return undefined;
    }
  };

  return () => {
    const state = useObservable(sessionService.state$.pipe(debounceTime(500)));
    const autoRefreshEnabled = useObservable(isAutoRefreshEnabled$, isAutoRefreshEnabled());
    const appId = useObservable(application.currentAppId$, undefined);

    let disabled = false;
    let disabledReasonText: string = '';

    if (getCapabilitiesByAppId(application.capabilities, appId)?.storeSearchSession !== true) {
      disabled = true;
      disabledReasonText = i18n.translate('xpack.data.backgroundSessionIndicator.noCapability', {
        defaultMessage: "You don't have permissions to send to background.",
      });
    }

    if (autoRefreshEnabled) {
      disabled = true;
      disabledReasonText = i18n.translate(
        'xpack.data.backgroundSessionIndicator.disabledDueToAutoRefreshMessage',
        {
          defaultMessage: 'Send to background is not available when auto refresh is enabled.',
        }
      );
    }

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
          disabled={disabled}
          disabledReasonText={disabledReasonText}
        />
      </RedirectAppLinks>
    );
  };
};
