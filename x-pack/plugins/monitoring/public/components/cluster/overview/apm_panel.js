/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import { get } from 'lodash';
import { formatMetric } from '../../../lib/format_number';
import { ClusterItemContainer, BytesUsage, DisabledIfNoDataAndInSetupModeLink } from './helpers';
import { FormattedMessage } from '@kbn/i18n-react';
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
import { isSetupModeFeatureEnabled } from '../../../lib/setup_mode';
import { SetupModeFeature } from '../../../../common/enums';
import { checkAgentTypeMetric } from '../../../lib/apm_agent';

const getServerTitle = (isFleetTypeMetric, total) => {
  const apmsTotal = <span data-test-subj="apmsTotal">{total}</span>;
  const linkLabel = {};
  if (isFleetTypeMetric) {
    linkLabel.link = (
      <FormattedMessage
        id="xpack.monitoring.cluster.overview.apmPanel.agentServersTotalLinkLabel"
        defaultMessage="APM & Fleet Servers: {apmsTotal}"
        values={{ apmsTotal }}
      />
    );
    linkLabel.aria = i18n.translate(
      'xpack.monitoring.cluster.overview.apmPanel.instancesAndFleetsTotalLinkAriaLabel',
      {
        defaultMessage: 'APM and Fleet server instances: {apmsTotal}',
        values: { apmsTotal },
      }
    );
    return linkLabel;
  }
  linkLabel.link = (
    <FormattedMessage
      id="xpack.monitoring.cluster.overview.apmPanel.serversTotalLinkLabel"
      defaultMessage="APM servers: {apmsTotal}"
      values={{ apmsTotal }}
    />
  );
  linkLabel.aria = i18n.translate(
    'xpack.monitoring.cluster.overview.apmPanel.instancesTotalLinkAriaLabel',
    {
      defaultMessage: 'APM server instances: {apmsTotal}',
      values: { apmsTotal },
    }
  );

  return linkLabel;
};

const getOverviewTitle = (isFleetTypeMetric) => {
  if (isFleetTypeMetric) {
    return i18n.translate('xpack.monitoring.cluster.overview.apmPanel.overviewFleetLinkLabel', {
      defaultMessage: 'APM & Fleet server overview',
    });
  }
  return i18n.translate('xpack.monitoring.cluster.overview.apmPanel.overviewLinkLabel', {
    defaultMessage: 'APM server overview',
  });
};

const getHeadingTitle = (isFleetTypeMetric) => {
  if (isFleetTypeMetric) {
    return i18n.translate('xpack.monitoring.cluster.overview.apmPanel.apmFleetTitle', {
      defaultMessage: 'APM & Fleet server',
    });
  }
  return i18n.translate('xpack.monitoring.cluster.overview.apmPanel.apmTitle', {
    defaultMessage: 'APM server',
  });
};

export function ApmPanel(props) {
  const { setupMode, versions } = props;
  const apmsTotal = get(props, 'apms.total') || 0;
  // Do not show if we are not in setup mode
  if (apmsTotal === 0 && !setupMode.enabled) {
    return null;
  }

  const isFleetTypeMetric = checkAgentTypeMetric(versions);
  const { link, aria } = getServerTitle(isFleetTypeMetric, apmsTotal);
  const overviewTitle = getOverviewTitle(isFleetTypeMetric);
  const goToInstances = () => getSafeForExternalLink('#/apm/instances');
  const setupModeData = get(setupMode.data, 'apm');
  const setupModeMetricbeatMigrationTooltip = isSetupModeFeatureEnabled(
    SetupModeFeature.MetricbeatMigration
  ) ? (
    <SetupModeTooltip
      setupModeData={setupModeData}
      badgeClickLink={goToInstances()}
      productName={APM_SYSTEM_ID}
    />
  ) : null;

  return (
    <ClusterItemContainer {...props} url="apm" title={getHeadingTitle(isFleetTypeMetric)}>
      <EuiFlexGrid columns={4}>
        <EuiFlexItem>
          <EuiPanel paddingSize="m">
            <EuiTitle size="s">
              <h3>
                <DisabledIfNoDataAndInSetupModeLink
                  setupModeEnabled={setupMode.enabled}
                  setupModeData={setupModeData}
                  href={getSafeForExternalLink('#/apm')}
                  aria-label={overviewTitle}
                  data-test-subj="apmOverview"
                >
                  {overviewTitle}
                </DisabledIfNoDataAndInSetupModeLink>
              </h3>
            </EuiTitle>
            <EuiHorizontalRule margin="m" />
            <EuiDescriptionList type="column">
              <EuiDescriptionListTitle className="eui-textBreakWord">
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.apmPanel.processedEventsLabel"
                  defaultMessage="Processed Events"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="apmsTotalEvents">
                {formatMetric(props.totalEvents, '0.[0]a')}
              </EuiDescriptionListDescription>
              <EuiDescriptionListTitle className="eui-textBreakWord">
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
                    <EuiLink href={goToInstances()} aria-label={aria} data-test-subj="apmListing">
                      {link}
                    </EuiLink>
                  </h3>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="s" alignItems="center">
                  {setupModeMetricbeatMigrationTooltip}
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiHorizontalRule margin="m" />
            <EuiDescriptionList type="column">
              <EuiDescriptionListTitle className="eui-textBreakWord">
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.apmPanel.memoryUsageLabel"
                  defaultMessage="Memory Usage (delta)"
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
