/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect } from 'react-router-dom';
import { EuiButton, EuiCallOut, EuiLink, EuiSpacer } from '@elastic/eui';
import { useTrackPageview } from '@kbn/observability-plugin/public';

import { GETTING_STARTED_ROUTE } from '../../../../../common/constants';

import { ServiceAllowedWrapper } from '../common/wrappers/service_allowed_wrapper';
import { useLocations } from '../../hooks';

import { Loader } from './management/loader/loader';
import { useEnablement } from '../../hooks/use_enablement';

import { EnablementEmptyState } from './management/synthetics_enablement/synthetics_enablement';
import { MonitorListContainer } from './management/monitor_list_container';
import { useMonitorListBreadcrumbs } from './hooks/use_breadcrumbs';
import { useMonitorList } from './hooks/use_monitor_list';
import * as labels from './management/labels';

const MonitorPage: React.FC = () => {
  useTrackPageview({ app: 'synthetics', path: 'monitors' });
  useTrackPageview({ app: 'synthetics', path: 'monitors', delay: 15000 });

  useMonitorListBreadcrumbs();

  const monitorListProps = useMonitorList();
  const {
    syntheticsMonitors,
    loading: monitorsLoading,
    isDataQueried,
    absoluteTotal,
  } = monitorListProps;

  const {
    error: enablementError,
    enablement: { isEnabled, canEnable },
    loading: enablementLoading,
    enableSynthetics,
  } = useEnablement();

  const { loading: locationsLoading } = useLocations();
  const showEmptyState = isEnabled !== undefined && syntheticsMonitors.length === 0;

  if (isEnabled && !monitorsLoading && absoluteTotal === 0 && isDataQueried) {
    return <Redirect to={GETTING_STARTED_ROUTE} />;
  }

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
        <MonitorListContainer isEnabled={isEnabled} monitorListProps={monitorListProps} />
      </Loader>
      {showEmptyState && <EnablementEmptyState />}
    </>
  );
};

export const MonitorsPageWithServiceAllowed = React.memo(() => (
  <ServiceAllowedWrapper>
    <MonitorPage />
  </ServiceAllowedWrapper>
));
