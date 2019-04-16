/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, EuiText } from '@elastic/eui';
import { EuiPopover, EuiButtonIcon } from '@elastic/eui';
import React, { useState, useContext } from 'react';
import { get } from 'lodash';
import { i18n } from '@kbn/i18n';
import { LatestMonitor } from '../../../common/graphql/types';
import { UptimeSettingsContext } from '../../contexts';

interface MonitorListPopoverProps {
  monitor: LatestMonitor;
}

export const ObservabilityIntegrationsPopover = ({ monitor }: MonitorListPopoverProps) => {
  const [isPopoverVisible, setIsPopoverVisible] = useState<boolean>(false);
  const { basePath, dateRangeStart, dateRangeEnd } = useContext(UptimeSettingsContext);
  const domain = get<string | null>(monitor, 'ping.url.domain', null);

  const apmHref = `${basePath}/app/apm#/services?kuery=${encodeURI(
    `url.domain: "${domain}"`
  )}&rangeFrom=${dateRangeStart}&rangeTo=${dateRangeEnd}`;

  return (
    <EuiPopover
      anchorPosition="rightCenter"
      button={
        <EuiButtonIcon
          aria-label={i18n.translate('xpack.uptime.monitorListPopover.toggleButtonAriaLabel', {
            description: `The aria-label of a button that toggles a popover's visibility`,
            defaultMessage: 'Display the integrations popover',
          })}
          color="subdued"
          isDisabled={domain === null}
          onClick={() => setIsPopoverVisible(true)}
          iconType="boxesVertical"
        />
      }
      closePopover={() => setIsPopoverVisible(false)}
      id="integrationsPopover"
      isOpen={isPopoverVisible}
    >
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiLink href={apmHref}>
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiIcon
                  aria-label={i18n.translate('xpack.uptime.monitorListPopover.apmIntegrationIcon', {
                    defaultMessage: 'Navigate to APM in current window',
                    description:
                      'We provide integrations for APM. This button will take the user to a new page in the current window.',
                  })}
                  type="apmApp"
                  size="m"
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s">
                  {i18n.translate('xpack.uptime.monitorListPopover.apmIntegrationMessage', {
                    defaultMessage: 'APM Services',
                    description: `Searches for APM services with the current monitor's domain`,
                  })}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiIcon size="m" type="popout" />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPopover>
  );
};
