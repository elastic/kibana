/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import moment from 'moment';
import { get } from 'lodash';
import { formatMetric } from '../../../lib/format_number';
import { ClusterItemContainer, BytesUsage, DisabledIfNoDataAndInSetupModeLink } from './helpers';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGrid,
  EuiFlexItem,
  EuiLink,
  EuiTitle,
  EuiPanel,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiHorizontalRule,
  EuiFlexGroup,
} from '@elastic/eui';
import { formatTimestampToDuration } from '../../../../common';
import { CALCULATE_DURATION_SINCE, APM_SYSTEM_ID } from '../../../../common/constants';
import { SetupModeTooltip } from '../../setup_mode/tooltip';
import { getSafeForExternalLink } from '../../../lib/get_safe_for_external_link';

export function ApmPanel(props) {
  const { setupMode } = props;
  const apmsTotal = get(props, 'apms.total') || 0;
  // Do not show if we are not in setup mode
  if (apmsTotal === 0 && !setupMode.enabled) {
    return null;
  }

  const goToInstances = () => getSafeForExternalLink('#/apm/instances');
  const setupModeData = get(setupMode.data, 'apm');
  const setupModeTooltip =
    setupMode && setupMode.enabled ? (
      <SetupModeTooltip
        setupModeData={setupModeData}
        badgeClickLink={goToInstances()}
        productName={APM_SYSTEM_ID}
      />
    ) : null;

  return (
    <ClusterItemContainer
      {...props}
      url="apm"
      title={i18n.translate('xpack.monitoring.cluster.overview.apmPanel.apmTitle', {
        defaultMessage: 'APM',
      })}
    >
      <EuiFlexGrid columns={4}>
        <EuiFlexItem>
          <EuiPanel paddingSize="m">
            <EuiTitle size="s">
              <h3>
                <DisabledIfNoDataAndInSetupModeLink
                  setupModeEnabled={setupMode.enabled}
                  setupModeData={setupModeData}
                  href={getSafeForExternalLink('#/apm')}
                  aria-label={i18n.translate(
                    'xpack.monitoring.cluster.overview.apmPanel.overviewLinkAriaLabel',
                    {
                      defaultMessage: 'APM Overview',
                    }
                  )}
                  data-test-subj="apmOverview"
                >
                  <FormattedMessage
                    id="xpack.monitoring.cluster.overview.apmPanel.overviewLinkLabel"
                    defaultMessage="Overview"
                  />
                </DisabledIfNoDataAndInSetupModeLink>
              </h3>
            </EuiTitle>
            <EuiHorizontalRule margin="m" />
            <EuiDescriptionList type="column">
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.apmPanel.processedEventsLabel"
                  defaultMessage="Processed Events"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="apmsTotalEvents">
                {formatMetric(props.totalEvents, '0.[0]a')}
              </EuiDescriptionListDescription>
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.apmPanel.lastEventLabel"
                  defaultMessage="Last Event"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="apmsBytesSent">
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.apmPanel.lastEventDescription"
                  defaultMessage="{timeOfLastEvent} ago"
                  values={{
                    timeOfLastEvent: formatTimestampToDuration(
                      +moment(props.timeOfLastEvent),
                      CALCULATE_DURATION_SINCE
                    ),
                  }}
                />
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel paddingSize="m">
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiTitle size="s">
                  <h3>
                    <EuiLink
                      href={goToInstances()}
                      aria-label={i18n.translate(
                        'xpack.monitoring.cluster.overview.apmPanel.instancesTotalLinkAriaLabel',
                        {
                          defaultMessage: 'APM Instances: {apmsTotal}',
                          values: { apmsTotal },
                        }
                      )}
                      data-test-subj="apmListing"
                    >
                      <FormattedMessage
                        id="xpack.monitoring.cluster.overview.apmPanel.serversTotalLinkLabel"
                        defaultMessage="APM Servers: {apmsTotal}"
                        values={{ apmsTotal: <span data-test-subj="apmsTotal">{apmsTotal}</span> }}
                      />
                    </EuiLink>
                  </h3>
                </EuiTitle>
              </EuiFlexItem>
              {setupModeTooltip}
            </EuiFlexGroup>
            <EuiHorizontalRule margin="m" />
            <EuiDescriptionList type="column">
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.apmPanel.memoryUsageLabel"
                  defaultMessage="Memory Usage"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="apmMemoryUsage">
                <BytesUsage usedBytes={props.memRss} />
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGrid>
    </ClusterItemContainer>
  );
}
