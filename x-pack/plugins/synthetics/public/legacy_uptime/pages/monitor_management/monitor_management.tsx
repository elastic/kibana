/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useSelector } from 'react-redux';
import { EuiCallOut, EuiButton, EuiSpacer, EuiLink } from '@elastic/eui';
import { useTrackPageview } from '@kbn/observability-plugin/public';
import { ManageLocationsPortal } from '../../components/monitor_management/manage_locations/manage_locations';
import { monitorManagementListSelector } from '../../state/selectors';
import { useMonitorManagementBreadcrumbs } from './use_monitor_management_breadcrumbs';
import { MonitorListContainer } from '../../components/monitor_management/monitor_list/monitor_list_container';
import { EnablementEmptyState } from '../../components/monitor_management/monitor_list/enablement_empty_state';
import { useEnablement } from '../../components/monitor_management/hooks/use_enablement';
import { useLocations } from '../../components/monitor_management/hooks/use_locations';
import { Loader } from '../../components/monitor_management/loader/loader';
import { ERROR_HEADING_LABEL } from './content';
import { useMonitorList } from '../../components/monitor_management/hooks/use_monitor_list';

export const MonitorManagementPage: React.FC = () => {
  useTrackPageview({ app: 'uptime', path: 'manage-monitors' });
  useTrackPageview({ app: 'uptime', path: 'manage-monitors', delay: 15000 });
  useMonitorManagementBreadcrumbs();
  const [shouldFocusEnablementButton, setShouldFocusEnablementButton] = useState(false);

  const {
    error: enablementError,
    enablement,
    loading: enablementLoading,
    enableSynthetics,
  } = useEnablement();
  const { loading: locationsLoading } = useLocations();
  const { list: monitorList } = useSelector(monitorManagementListSelector);
  const { isEnabled } = enablement;

  const isEnabledRef = useRef(isEnabled);

  useEffect(() => {
    if (!isEnabled && isEnabledRef.current === true) {
      /* shift focus to enable button when enable toggle disappears. Prevent
       * focus loss on the page */
      setShouldFocusEnablementButton(true);
    }
    isEnabledRef.current = Boolean(isEnabled);
  }, [isEnabled]);

  const { pageState, dispatchPageAction } = useMonitorList();

  const showEmptyState = isEnabled !== undefined && monitorList.total === 0;

  return (
    <>
      <Loader
        loading={enablementLoading || locationsLoading}
        error={Boolean(enablementError)}
        loadingTitle={LOADING_LABEL}
        errorTitle={ERROR_HEADING_LABEL}
        errorBody={ERROR_HEADING_BODY}
      >
        {!isEnabled && monitorList.total && monitorList.total > 0 ? (
          <>
            <EuiCallOut title={CALLOUT_MANAGEMENT_DISABLED} color="warning" iconType="help">
              <p>{CALLOUT_MANAGEMENT_DESCRIPTION}</p>
              {enablement.canEnable ? (
                <EuiButton
                  fill
                  color="primary"
                  onClick={() => {
                    enableSynthetics();
                  }}
                >
                  {SYNTHETICS_ENABLE_LABEL}
                </EuiButton>
              ) : (
                <p>
                  {CALLOUT_MANAGEMENT_CONTACT_ADMIN}{' '}
                  <EuiLink href="#" target="_blank">
                    {LEARN_MORE_LABEL}
                  </EuiLink>
                </p>
              )}
            </EuiCallOut>
            <EuiSpacer size="s" />
          </>
        ) : null}
        <MonitorListContainer
          isEnabled={isEnabled}
          pageState={pageState}
          dispatchPageAction={dispatchPageAction}
        />
        <ManageLocationsPortal />
      </Loader>
      {showEmptyState && <EnablementEmptyState focusButton={shouldFocusEnablementButton} />}
    </>
  );
};

const LOADING_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.manageMonitorLoadingLabel',
  {
    defaultMessage: 'Loading Monitor Management',
  }
);

const LEARN_MORE_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.manageMonitorLoadingLabel.callout.learnMore',
  {
    defaultMessage: 'Learn more.',
  }
);

const CALLOUT_MANAGEMENT_DISABLED = i18n.translate(
  'xpack.synthetics.monitorManagement.callout.disabled',
  {
    defaultMessage: 'Monitor Management is disabled',
  }
);

const CALLOUT_MANAGEMENT_CONTACT_ADMIN = i18n.translate(
  'xpack.synthetics.monitorManagement.callout.disabled.adminContact',
  {
    defaultMessage: 'Please contact your administrator to enable Monitor Management.',
  }
);

const CALLOUT_MANAGEMENT_DESCRIPTION = i18n.translate(
  'xpack.synthetics.monitorManagement.callout.description.disabled',
  {
    defaultMessage:
      'Monitor Management is currently disabled. To run your monitors on Elastic managed Synthetics service, enable Monitor Management. Your existing monitors are paused.',
  }
);

const ERROR_HEADING_BODY = i18n.translate(
  'xpack.synthetics.monitorManagement.editMonitorError.description',
  {
    defaultMessage: 'Monitor Management settings could not be loaded. Please contact Support.',
  }
);

const SYNTHETICS_ENABLE_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.syntheticsEnableLabel.management',
  {
    defaultMessage: 'Enable Monitor Management',
  }
);
