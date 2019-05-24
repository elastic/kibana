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
import {
  getApmHref,
  getInfraContainerHref,
  getInfraIpHref,
  getInfraKubernetesHref,
  getLoggingContainerHref,
  getLoggingKubernetesHref,
} from '../../lib/helper';

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
  const domain = get<string>(ping, 'url.domain', '');
  const podUid = get<string | undefined>(ping, 'kubernetes.pod.uid', undefined);
  const containerId = get<string | undefined>(ping, 'container.id', undefined);
  const ip = get<string | undefined>(ping, 'monitor.ip');
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
      <EuiFlexGroup direction="column">
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
        <EuiFlexItem>
          <IntegrationLink
            ariaLabel={i18n.translate(
              'xpack.uptime.monitorList.infraIntegrationAction.ip.ariaLabel',
              {
                defaultMessage: `Check Infrastructure UI for this montor's ip address`,
                description: 'This value is shown as the aria label value for screen readers.',
              }
            )}
            href={getInfraIpHref(monitor, basePath)}
            iconType="infraApp"
            message={i18n.translate('xpack.uptime.monitorList.infraIntegrationAction.ip.message', {
              defaultMessage: 'Show host metrics',
              description: `A message explaining that this link will take the user to the Infrastructure UI, filtered for this monitor's IP Address`,
            })}
            tooltipContent={i18n.translate(
              'xpack.uptime.monitorList.infraIntegrationAction.ip.tooltip',
              {
                defaultMessage: 'Check Infrastructure UI for the IP "{ip}"',
                values: {
                  ip,
                },
              }
            )}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <IntegrationLink
            ariaLabel={i18n.translate(
              'xpack.uptime.monitorList.infraIntegrationAction.kubernetes.description',
              {
                defaultMessage: `Check Infrastructure UI for this monitor's pod UID`,
                description: 'This value is shown as the aria label value for screen readers.',
              }
            )}
            href={getInfraKubernetesHref(monitor, basePath)}
            iconType="infraApp"
            message={i18n.translate(
              'xpack.uptime.monitorList.infraIntegrationAction.kubernetes.message',
              {
                defaultMessage: 'Show pod metrics',
                description:
                  'A message explaining that this link will take the user to the Infrastructure UI filtered for the monitor Pod UID.',
              }
            )}
            tooltipContent={i18n.translate(
              'xpack.uptime.monitorList.infraIntegrationAction.kubernetes.tooltip',
              {
                defaultMessage: 'Check Infrastructure UI for pod UID "{podUid}".',
                values: {
                  podUid,
                },
              }
            )}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <IntegrationLink
            ariaLabel={i18n.translate(
              'xpack.uptime.monitorList.infraIntegrationAction.docker.description',
              {
                defaultMessage: `Check Infrastructure UI for this monitor's container ID`,
              }
            )}
            href={getInfraContainerHref(monitor, basePath)}
            iconType="infraApp"
            message={i18n.translate(
              'xpack.uptime.monitorList.infraIntegrationAction.container.message',
              {
                defaultMessage: 'Show container metrics',
              }
            )}
            tooltipContent={i18n.translate(
              'xpack.uptime.monitorList.infraIntegrationAction.docker.tooltip',
              {
                defaultMessage: 'Check Infrastructure UI for container ID "{containerId}"',
                values: {
                  containerId,
                },
              }
            )}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <IntegrationLink
            ariaLabel={i18n.translate(
              'xpack.uptime.monitorList.loggingIntegrationAction.kubernetes.ariaLabel',
              {
                defaultMessage: 'Show pod logs',
              }
            )}
            href={getLoggingKubernetesHref(monitor, basePath)}
            iconType="loggingApp"
            message={i18n.translate(
              'xpack.uptime.monitorList.loggingIntegrationAction.kubernetes.message',
              {
                defaultMessage: 'Show pod logs',
              }
            )}
            tooltipContent={i18n.translate(
              'xpack.uptime.monitorList.loggingIntegrationAction.kubernetes.tooltip',
              {
                defaultMessage: 'Check for logs for pod UID "{podUid}"',
                values: {
                  podUid,
                },
              }
            )}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <IntegrationLink
            ariaLabel={i18n.translate(
              'xpack.uptime.monitorList.loggingIntegrationAction.container.id',
              {
                defaultMessage: 'Show container logs',
              }
            )}
            href={getLoggingContainerHref(monitor, basePath)}
            iconType="loggingApp"
            message={i18n.translate(
              'xpack.uptime.monitorList.loggingIntegrationAction.container.message',
              {
                defaultMessage: 'Show container logs',
              }
            )}
            tooltipContent={i18n.translate(
              'xpack.uptime.monitorList.loggingIntegrationAction.container.tooltip',
              {
                defaultMessage: 'Check Logging UI for container ID "{containerId}"',
                values: {
                  containerId,
                },
              }
            )}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPopover>
  );
};
