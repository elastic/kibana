/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiPopover } from '@elastic/eui';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import { LatestMonitor } from '../../../common/graphql/types';
import { IntegrationLink } from './integration_link';
import { getApmHref } from '../../lib/helper';

interface MonitorListActionsPopoverProps {
  basePath: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  monitor: LatestMonitor;
}

export const MonitorListActionsPopover = ({
  basePath,
  dateRangeStart,
  dateRangeEnd,
  monitor,
  monitor: { ping },
}: MonitorListActionsPopoverProps) => {
  const popoverId = `${monitor.id.key}_popover`;
  const [popoverIsVisible, setPopoverIsVisible] = useState<boolean>(false);
  const domain = get(ping, 'url.domain', '');
  return (
    <EuiPopover
      button={
        <EuiButtonIcon
          aria-label={i18n.translate(
            'xpack.uptime.monitorList.observabilityIntegrationsColumn.popoverIconButton.ariaLabel',
            {
              defaultMessage: 'Opens integrations popover for monitor with url {monitorUrl}',
              description:
                'A message explaining that this button opens a popover with links to other apps for a given monitor',
              values: { monitorUrl: monitor.id.url },
            }
          )}
          color="subdued"
          iconType="boxesHorizontal"
          onClick={() => setPopoverIsVisible(true)}
        />
      }
      closePopover={() => setPopoverIsVisible(false)}
      id={popoverId}
      isOpen={popoverIsVisible}
    >
      <EuiFlexGroup>
        <EuiFlexItem>
          <IntegrationLink
            ariaLabel={i18n.translate('xpack.uptime.apmIntegrationAction.description', {
              defaultMessage: 'Search APM for this monitor',
              description:
                'This value is shown to users when they hover over an icon that will take them to the APM app.',
            })}
            href={getApmHref(monitor, basePath, dateRangeStart, dateRangeEnd)}
            iconType="apmApp"
            message={i18n.translate('xpack.uptime.apmIntegrationAction.text', {
              defaultMessage: 'Check APM for domain',
              description:
                'A message explaining that when the user clicks the associated link, it will navigate to the APM app and search for the selected domain',
            })}
            tooltipContent={i18n.translate(
              'xpack.uptime.monitorList.observabilityIntegrationsColumn.apmIntegrationLink.tooltip',
              {
                defaultMessage: 'Click here to check APM for the domain "{domain}".',
                description:
                  'A messsage shown in a tooltip explaining that the nested anchor tag will navigate to the APM app and search for the given URL domain.',
                values: {
                  domain,
                },
              }
            )}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPopover>
  );
};
