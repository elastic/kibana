/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import React from 'react';
import { formatMetric } from '../../../lib/format_number';
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
import { ClusterItemContainer, DisabledIfNoDataAndInSetupModeLink } from './helpers';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { SetupModeTooltip } from '../../setup_mode/tooltip';
import { ALERT_MISSING_MONITORING_DATA, BEATS_SYSTEM_ID } from '../../../../common/constants';
import { getSafeForExternalLink } from '../../../lib/get_safe_for_external_link';
import { isSetupModeFeatureEnabled } from '../../../lib/setup_mode';
import { SetupModeFeature } from '../../../../common/enums';
import { shouldShowAlertBadge } from '../../../alerts/lib/should_show_alert_badge';
import { AlertsBadge } from '../../../alerts/badge';
import { SetupModeContext } from '../../setup_mode/setup_mode_context';

const BEATS_PANEL_ALERTS = [ALERT_MISSING_MONITORING_DATA];

export function BeatsPanel(props) {
  const { setupMode, alerts } = props;
  const setupModeContext = React.useContext(SetupModeContext);
  const beatsTotal = get(props, 'beats.total') || 0;
  // Do not show if we are not in setup mode
  if (beatsTotal === 0 && !setupMode.enabled) {
    return null;
  }

  const setupModeData = get(setupMode.data, 'beats');
  const setupModeMetricbeatMigrationTooltip = isSetupModeFeatureEnabled(
    SetupModeFeature.MetricbeatMigration
  ) ? (
    <SetupModeTooltip
      setupModeData={setupModeData}
      productName={BEATS_SYSTEM_ID}
      badgeClickLink={getSafeForExternalLink('#/beats/beats')}
    />
  ) : null;

  let beatsAlertsStatus = null;
  if (shouldShowAlertBadge(alerts, BEATS_PANEL_ALERTS, setupModeContext)) {
    const alertsList = BEATS_PANEL_ALERTS.map((alertType) => alerts[alertType]);
    beatsAlertsStatus = (
      <EuiFlexItem grow={false}>
        <AlertsBadge alerts={alertsList} />
      </EuiFlexItem>
    );
  }

  const beatTypes = props.beats.types.map((beat, index) => {
    return [
      <EuiDescriptionListTitle
        key={`beat-types-type-${index}`}
        data-test-subj="beatTypeCount"
        data-test-beat-type-count={beat.type + ':' + beat.count}
      >
        {beat.type}
      </EuiDescriptionListTitle>,
      <EuiDescriptionListDescription key={`beat-types-count-${index}`}>
        {beat.count}
      </EuiDescriptionListDescription>,
    ];
  });

  return (
    <ClusterItemContainer
      {...props}
      url="beats"
      title={i18n.translate('xpack.monitoring.cluster.overview.beatsPanel.beatsTitle', {
        defaultMessage: 'Beats',
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
                  href={getSafeForExternalLink('#/beats')}
                  aria-label={i18n.translate(
                    'xpack.monitoring.cluster.overview.beatsPanel.overviewLinkAriaLabel',
                    {
                      defaultMessage: 'Beats Overview',
                    }
                  )}
                  data-test-subj="beatsOverview"
                >
                  <FormattedMessage
                    id="xpack.monitoring.cluster.overview.beatsPanel.overviewLinkLabel"
                    defaultMessage="Overview"
                  />
                </DisabledIfNoDataAndInSetupModeLink>
              </h3>
            </EuiTitle>
            <EuiHorizontalRule margin="m" />
            <EuiDescriptionList type="column">
              <EuiDescriptionListTitle className="eui-textBreakWord">
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.beatsPanel.totalEventsLabel"
                  defaultMessage="Total Events"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="beatsTotalEvents">
                {formatMetric(props.totalEvents, '0.[0]a')}
              </EuiDescriptionListDescription>
              <EuiDescriptionListTitle className="eui-textBreakWord">
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.beatsPanel.bytesSentLabel"
                  defaultMessage="Bytes Sent"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="beatsBytesSent">
                {formatMetric(props.bytesSent, 'byte')}
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
                      href={getSafeForExternalLink('#/beats/beats')}
                      aria-label={i18n.translate(
                        'xpack.monitoring.cluster.overview.beatsPanel.instancesTotalLinkAriaLabel',
                        {
                          defaultMessage: 'Beats Instances: {beatsTotal}',
                          values: { beatsTotal },
                        }
                      )}
                      data-test-subj="beatsListing"
                    >
                      <FormattedMessage
                        id="xpack.monitoring.cluster.overview.beatsPanel.beatsTotalLinkLabel"
                        defaultMessage="Beats: {beatsTotal}"
                        values={{
                          beatsTotal: <span data-test-subj="beatsTotal">{beatsTotal}</span>,
                        }}
                      />
                    </EuiLink>
                  </h3>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="s" alignItems="center">
                  {setupModeMetricbeatMigrationTooltip}
                  {beatsAlertsStatus}
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiHorizontalRule margin="m" />
            <EuiDescriptionList type="column">{beatTypes}</EuiDescriptionList>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGrid>
    </ClusterItemContainer>
  );
}
