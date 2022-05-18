/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiCallOut, EuiLink, EuiSpacer } from '@elastic/eui';
import { useTrackPageview } from '@kbn/observability-plugin/public';

import { useLocations } from '../../hooks/use_locations';

import { Loader } from './loader/loader';
import { useEnablement } from '../../hooks/use_enablement';

import { EnablementEmptyState } from './synthetics_enablement/synthetics_enablement';
import { MonitorListContainer } from './monitor_list_container';
import { useMonitorListBreadcrumbs } from './use_breadcrumbs';
import { useMonitorList } from './hooks/use_monitor_list';
import * as labels from './labels';

export const MonitorListPage: React.FC = () => {
  useTrackPageview({ app: 'synthetics', path: 'manage-monitors' });
  useTrackPageview({ app: 'synthetics', path: 'manage-monitors', delay: 15000 });

  useMonitorListBreadcrumbs();

  const { syntheticsMonitors } = useMonitorList();

  const {
    error: enablementError,
    enablement: { isEnabled, canEnable },
    loading: enablementLoading,
    enableSynthetics,
  } = useEnablement();

  const { loading: locationsLoading } = useLocations();
  const showEmptyState = isEnabled !== undefined && syntheticsMonitors.length === 0;

  return (
    <>
      <Loader
        loading={enablementLoading || locationsLoading}
        error={Boolean(enablementError)}
        loadingTitle={labels.LOADING_LABEL}
        errorTitle={labels.ERROR_HEADING_LABEL}
        errorBody={labels.ERROR_HEADING_BODY}
      >
        {!isEnabled && syntheticsMonitors.length > 0 ? (
          <>
            <EuiCallOut title={labels.CALLOUT_MANAGEMENT_DISABLED} color="warning" iconType="help">
              <p>{labels.CALLOUT_MANAGEMENT_DESCRIPTION}</p>
              {canEnable ? (
                <EuiButton
                  fill
                  color="primary"
                  onClick={() => {
                    enableSynthetics();
                  }}
                >
                  {labels.SYNTHETICS_ENABLE_LABEL}
                </EuiButton>
              ) : (
                <p>
                  {labels.CALLOUT_MANAGEMENT_CONTACT_ADMIN}{' '}
                  <EuiLink href="#" target="_blank">
                    {labels.LEARN_MORE_LABEL}
                  </EuiLink>
                </p>
              )}
            </EuiCallOut>
            <EuiSpacer size="s" />
          </>
        ) : null}
        <MonitorListContainer isEnabled={isEnabled} />
      </Loader>
      {showEmptyState && <EnablementEmptyState />}
    </>
  );
};
