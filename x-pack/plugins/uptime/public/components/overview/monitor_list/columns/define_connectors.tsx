/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSwitch, EuiFormRow } from '@elastic/eui';
import { useRouteMatch } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { ReactRouterEuiLink } from '../../../common/react_router_helpers';
import { MONITOR_ROUTE, SETTINGS_ROUTE } from '../../../../../common/constants';
import { ENABLE_STATUS_ALERT } from './translations';

const SETTINGS_LINK_TEXT = i18n.translate('xpack.uptime.page_header.defineConnector.settings', {
  defaultMessage: 'Settings',
});

export const DefineAlertConnectors = () => {
  const isMonitorPage = useRouteMatch(MONITOR_ROUTE);

  return (
    <EuiFormRow
      helpText={
        <>
          <FormattedMessage
            id="xpack.uptime.monitorList.defineConnector.description"
            defaultMessage="Define a default connector in the {link} to enable monitor status alerts."
            values={{
              link: (
                <ReactRouterEuiLink
                  to={SETTINGS_ROUTE + '?focusConnectorField=true'}
                  data-test-subj={'uptimeSettingsLink'}
                  target="_blank"
                >
                  {SETTINGS_LINK_TEXT}
                </ReactRouterEuiLink>
              ),
            }}
          />
        </>
      }
    >
      <EuiSwitch
        id={'defineAlertSettingsSwitch'}
        label={ENABLE_STATUS_ALERT}
        showLabel={!!isMonitorPage}
        aria-label={ENABLE_STATUS_ALERT}
        // this switch is read only, no onChange applied
        onChange={() => {}}
        checked={false}
        compressed={true}
        disabled={true}
        data-test-subj={'uptimeDisplayDefineConnector'}
      />
    </EuiFormRow>
  );
};
