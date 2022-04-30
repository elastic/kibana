/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiSwitch, EuiPopover, EuiText, EuiFormRow } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { ReactRouterEuiLink } from '../../../common/react_router_helpers';
import { SETTINGS_ROUTE } from '../../../../../common/constants';
import { ENABLE_STATUS_ALERT } from './translations';

interface Props {
  showPopover?: boolean;
  showHelpText?: boolean;
  showLabel?: boolean;
}

export const DefineAlertConnectors = ({
  showPopover = false,
  showHelpText = false,
  showLabel = false,
}: Props) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const onButtonClick = () => setIsPopoverOpen((val) => !val);
  const closePopover = () => setIsPopoverOpen(false);

  return (
    <EuiPopover
      button={
        <>
          <EuiFormRow
            helpText={
              showHelpText ? (
                <FormattedMessage
                  id="xpack.uptime.monitorList.defineConnector.description"
                  defaultMessage="Define a default connector in {link} to enable monitor status alerts."
                  values={{
                    link: (
                      <ReactRouterEuiLink
                        to={SETTINGS_ROUTE + '?focusConnectorField=true'}
                        data-test-subj={'uptimeSettingsLink'}
                        target="_blank"
                      >
                        <FormattedMessage
                          id="xpack.uptime.page_header.defineConnector.settingsLink"
                          defaultMessage="Settings"
                        />
                      </ReactRouterEuiLink>
                    ),
                  }}
                />
              ) : undefined
            }
          >
            <EuiSwitch
              id={'defineAlertSettingsSwitch'}
              label={ENABLE_STATUS_ALERT}
              showLabel={showLabel}
              aria-label={ENABLE_STATUS_ALERT}
              // this switch is read only, no onChange applied
              onChange={showPopover ? onButtonClick : () => {}}
              checked={false}
              compressed={true}
              disabled={!showPopover}
              data-test-subj={'uptimeDisplayDefineConnector'}
            />
          </EuiFormRow>
        </>
      }
      isOpen={showPopover ? isPopoverOpen : false}
      closePopover={closePopover}
    >
      <EuiText style={{ width: '350px' }} data-test-subj={'uptimeSettingsDefineConnector'}>
        <ReactRouterEuiLink
          to={SETTINGS_ROUTE + '?focusConnectorField=true'}
          data-test-subj={'uptimeSettingsLink'}
        >
          <FormattedMessage
            id="xpack.uptime.page_header.defineConnector.popover.defaultLink"
            defaultMessage="Define a default connector"
          />
        </ReactRouterEuiLink>{' '}
        <FormattedMessage
          id="xpack.uptime.monitorList.defineConnector.popover.description"
          defaultMessage="to receive status alerts."
        />
      </EuiText>
    </EuiPopover>
  );
};
