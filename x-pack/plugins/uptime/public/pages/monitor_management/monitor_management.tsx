/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useDispatch, useSelector } from 'react-redux';
import { EuiCallOut, EuiButton, EuiSpacer, EuiLink } from '@elastic/eui';
import { useTrackPageview } from '../../../../observability/public';
import { ConfigKey } from '../../../common/runtime_types';
import { getMonitors } from '../../state/actions';
import { monitorManagementListSelector } from '../../state/selectors';
import { useMonitorManagementBreadcrumbs } from './use_monitor_management_breadcrumbs';
import { MonitorListContainer } from '../../components/monitor_management/monitor_list/monitor_list_container';
import { EnablementEmptyState } from '../../components/monitor_management/monitor_list/enablement_empty_state';
import { useEnablement } from '../../components/monitor_management/hooks/use_enablement';
import { Loader } from '../../components/monitor_management/loader/loader';

export const MonitorManagementPage: React.FC = () => {
  useTrackPageview({ app: 'uptime', path: 'manage-monitors' });
  useTrackPageview({ app: 'uptime', path: 'manage-monitors', delay: 15000 });
  useMonitorManagementBreadcrumbs();
  const dispatch = useDispatch();
  const [shouldFocusEnablementButton, setShouldFocusEnablementButton] = useState(false);

  const {
    error: enablementError,
    enablement,
    loading: enablementLoading,
    enableSynthetics,
  } = useEnablement();
  const { list: monitorList } = useSelector(monitorManagementListSelector);
  const { isEnabled } = enablement;

  const isEnabledRef = useRef(isEnabled);

  useEffect(() => {
    if (monitorList.total === null) {
      dispatch(
        getMonitors({
          page: 1, // saved objects page index is base 1
          perPage: 10,
          sortOrder: 'asc',
          sortField: ConfigKey.NAME,
        })
      );
    }
  }, [dispatch, monitorList.total]);

  useEffect(() => {
    if (!isEnabled && isEnabledRef.current === true) {
      /* shift focus to enable button when enable toggle disappears. Prevent
       * focus loss on the page */
      setShouldFocusEnablementButton(true);
    }
    isEnabledRef.current = Boolean(isEnabled);
  }, [isEnabled]);

  return (
    <>
      <Loader
        loading={enablementLoading || monitorList.total === null}
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
        {isEnabled || (!isEnabled && monitorList.total) ? <MonitorListContainer /> : null}
      </Loader>
      {isEnabled !== undefined && monitorList.total === 0 && (
        <EnablementEmptyState focusButton={shouldFocusEnablementButton} />
      )}
    </>
  );
};

const LOADING_LABEL = i18n.translate('xpack.uptime.monitorManagement.manageMonitorLoadingLabel', {
  defaultMessage: 'Loading Monitor Management',
});

const LEARN_MORE_LABEL = i18n.translate(
  'xpack.uptime.monitorManagement.manageMonitorLoadingLabel.callout.learnMore',
  {
    defaultMessage: 'Learn more.',
  }
);

const CALLOUT_MANAGEMENT_DISABLED = i18n.translate(
  'xpack.uptime.monitorManagement.callout.disabled',
  {
    defaultMessage: 'Monitor Management is disabled',
  }
);

const CALLOUT_MANAGEMENT_CONTACT_ADMIN = i18n.translate(
  'xpack.uptime.monitorManagement.callout.disabled.adminContact',
  {
    defaultMessage: 'Please contact your administrator to enable Monitor Management.',
  }
);

const CALLOUT_MANAGEMENT_DESCRIPTION = i18n.translate(
  'xpack.uptime.monitorManagement.callout.description.disabled',
  {
    defaultMessage:
      'Monitor Management is currently disabled. To run your monitors on Elastic managed Synthetics service, enable Monitor Management. Your existing monitors are paused.',
  }
);

const ERROR_HEADING_LABEL = i18n.translate('xpack.uptime.monitorManagement.editMonitorError', {
  defaultMessage: 'Error loading Monitor Management',
});

const ERROR_HEADING_BODY = i18n.translate(
  'xpack.uptime.monitorManagement.editMonitorError.description',
  {
    defaultMessage: 'Monitor Management settings could not be loaded. Please contact Support.',
  }
);

const SYNTHETICS_ENABLE_LABEL = i18n.translate(
  'xpack.uptime.monitorManagement.syntheticsEnableLabel.management',
  {
    defaultMessage: 'Enable Monitor Management',
  }
);
