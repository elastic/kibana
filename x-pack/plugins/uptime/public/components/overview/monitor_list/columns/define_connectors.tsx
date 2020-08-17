/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiButtonIcon, EuiPopover, EuiText } from '@elastic/eui';
import { useRouteMatch } from 'react-router-dom';
import { ReactRouterEuiLink } from '../../../common/react_router_helpers';
import { MONITOR_ROUTE, SETTINGS_ROUTE } from '../../../../../common/constants';

interface Props {
  btnContent: JSX.Element;
}
export const DefineAlertConnectors = ({ btnContent }: Props) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const onButtonClick = () => setIsPopoverOpen((val) => !val);
  const closePopover = () => setIsPopoverOpen(false);

  const isMonitorPage = useRouteMatch(MONITOR_ROUTE);

  return (
    <EuiPopover
      button={
        isMonitorPage ? (
          btnContent
        ) : (
          <EuiButtonIcon
            aria-label={'Enable down alert'}
            style={{ marginRight: 10 }}
            iconType={'bell'}
            onClick={onButtonClick}
            data-test-subj={'uptimeDisplayDefineConnector'}
          />
        )
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
    >
      <EuiText style={{ width: '350px' }} data-test-subj={'uptimeSettingsDefineConnector'}>
        To start enabling alerts, please define a default alert action connector in{' '}
        <ReactRouterEuiLink to={SETTINGS_ROUTE} data-test-subj={'uptimeSettingsLink'}>
          Settings
        </ReactRouterEuiLink>
      </EuiText>
    </EuiPopover>
  );
};
