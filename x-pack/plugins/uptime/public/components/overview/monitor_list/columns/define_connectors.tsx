/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiPopover, EuiSwitch, EuiText } from '@elastic/eui';
import { useRouteMatch } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n/react';
import { ReactRouterEuiLink } from '../../../common/react_router_helpers';
import { MONITOR_ROUTE, SETTINGS_ROUTE } from '../../../../../common/constants';
import { ENABLE_STATUS_ALERT } from './translations';
import { SETTINGS_LINK_TEXT } from '../../../../pages/page_header';

export const DefineAlertConnectors = () => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const onButtonClick = () => setIsPopoverOpen((val) => !val);
  const closePopover = () => setIsPopoverOpen(false);

  const isMonitorPage = useRouteMatch(MONITOR_ROUTE);

  return (
    <EuiPopover
      button={
        <EuiSwitch
          id={'defineAlertSettingsSwitch'}
          label={ENABLE_STATUS_ALERT}
          showLabel={!!isMonitorPage}
          aria-label={ENABLE_STATUS_ALERT}
          onChange={onButtonClick}
          checked={false}
          compressed={!isMonitorPage}
          data-test-subj={'uptimeDisplayDefineConnector'}
        />
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
    >
      <EuiText style={{ width: '350px' }} data-test-subj={'uptimeSettingsDefineConnector'}>
        <FormattedMessage
          id="xpack.uptime.monitorList.defineConnector.description"
          defaultMessage="To start enabling alerts, please define a default alert action connector in"
        />{' '}
        <ReactRouterEuiLink
          to={SETTINGS_ROUTE + '?focusConnectorField=true'}
          data-test-subj={'uptimeSettingsLink'}
        >
          {SETTINGS_LINK_TEXT}
        </ReactRouterEuiLink>
      </EuiText>
    </EuiPopover>
  );
};
