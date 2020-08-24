/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiPopover, EuiSwitch, EuiText } from '@elastic/eui';
import { useRouteMatch } from 'react-router-dom';
import { ReactRouterEuiLink } from '../../../common/react_router_helpers';
import { MONITOR_ROUTE, SETTINGS_ROUTE } from '../../../../../common/constants';
import { ENABLE_STATUS_ALERT } from './translations';

export const DefineAlertConnectors = () => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const onButtonClick = () => setIsPopoverOpen((val) => !val);
  const closePopover = () => setIsPopoverOpen(false);

  const isMonitorPage = useRouteMatch(MONITOR_ROUTE);

  return (
    <EuiPopover
      button={
        <EuiSwitch
          label={ENABLE_STATUS_ALERT}
          showLabel={!!isMonitorPage}
          aria-label={ENABLE_STATUS_ALERT}
          onChange={onButtonClick}
          checked={false}
        />
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
    >
      <EuiText style={{ width: '350px' }} data-test-subj={'uptimeSettingsDefineConnector'}>
        To start enabling alerts, please define a default alert action connector in{' '}
        <ReactRouterEuiLink
          to={SETTINGS_ROUTE + '?focusConnectorField=true'}
          data-test-subj={'uptimeSettingsLink'}
        >
          Settings
        </ReactRouterEuiLink>
      </EuiText>
    </EuiPopover>
  );
};
