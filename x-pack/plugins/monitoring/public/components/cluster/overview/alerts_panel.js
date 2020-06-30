/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import moment from 'moment-timezone';
import { FormattedAlert } from '../../alerts/formatted_alert';
import { mapSeverity } from '../../alerts/map_severity';
import { formatTimestampToDuration } from '../../../../common/format_timestamp_to_duration';
import {
  CALCULATE_DURATION_SINCE,
  KIBANA_ALERTING_ENABLED,
  CALCULATE_DURATION_UNTIL,
} from '../../../../common/constants';
import { formatDateTimeLocal } from '../../../../common/formatting';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { getSafeForExternalLink } from '../../../lib/get_safe_for_external_link';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiButton,
  EuiText,
  EuiSpacer,
  EuiCallOut,
  EuiLink,
} from '@elastic/eui';

function replaceTokens(alert) {
  if (!alert.message.tokens) {
    return alert.message.text;
  }

  let text = alert.message.text;

  for (const token of alert.message.tokens) {
    if (token.type === 'time') {
      text = text.replace(
        token.startToken,
        token.isRelative
          ? formatTimestampToDuration(alert.expirationTime, CALCULATE_DURATION_UNTIL)
          : moment.tz(alert.expirationTime, moment.tz.guess()).format('LLL z')
      );
    } else if (token.type === 'link') {
      const linkPart = new RegExp(`${token.startToken}(.+?)${token.endToken}`).exec(text);
      // TODO: we assume this is at the end, which works for now but will not always work
      const nonLinkText = text.replace(linkPart[0], '');
      text = (
        <Fragment>
          {nonLinkText}
          <EuiLink href={`#${token.url}`}>{linkPart[1]}</EuiLink>
        </Fragment>
      );
    }
  }

  return text;
}

export function AlertsPanel({ alerts }) {
  if (!alerts || !alerts.length) {
    // no-op
    return null;
  }

  // enclosed component for accessing
  function TopAlertItem({ item, index }) {
    const severityIcon = mapSeverity(item.metadata.severity);

    if (item.resolved_timestamp) {
      severityIcon.title = i18n.translate(
        'xpack.monitoring.cluster.overview.alertsPanel.severityIconTitle',
        {
          defaultMessage: '{severityIconTitle} (resolved {time} ago)',
          values: {
            severityIconTitle: severityIcon.title,
            time: formatTimestampToDuration(item.resolved_timestamp, CALCULATE_DURATION_SINCE),
          },
        }
      );
      severityIcon.color = 'success';
      severityIcon.iconType = 'check';
    }

    return (
      <EuiCallOut
        key={`alert-item-${index}`}
        data-test-subj="topAlertItem"
        className="kuiVerticalRhythm"
        iconType={severityIcon.iconType}
        color={severityIcon.color}
        title={severityIcon.title}
      >
        <FormattedAlert
          prefix={item.prefix}
          suffix={item.suffix}
          message={item.message}
          metadata={item.metadata}
        />
        <EuiText size="xs">
          <EuiSpacer size="m" />
          <p data-test-subj="alertMeta">
            <FormattedMessage
              id="xpack.monitoring.cluster.overview.alertsPanel.lastCheckedTimeText"
              defaultMessage="Last checked {updateDateTime} (triggered {duration} ago)"
              values={{
                updateDateTime: formatDateTimeLocal(item.update_timestamp),
                duration: formatTimestampToDuration(item.timestamp, CALCULATE_DURATION_SINCE),
              }}
            />
          </p>
        </EuiText>
      </EuiCallOut>
    );
  }

  const alertsList = KIBANA_ALERTING_ENABLED
    ? alerts.map((alert, idx) => {
        const callOutProps = mapSeverity(alert.severity);
        const message = replaceTokens(alert);

        if (!alert.isFiring) {
          callOutProps.title = i18n.translate(
            'xpack.monitoring.cluster.overview.alertsPanel.severityIconTitle',
            {
              defaultMessage: '{severityIconTitle} (resolved {time} ago)',
              values: {
                severityIconTitle: callOutProps.title,
                time: formatTimestampToDuration(alert.resolvedMS, CALCULATE_DURATION_SINCE),
              },
            }
          );
          callOutProps.color = 'success';
          callOutProps.iconType = 'check';
        }

        return (
          <Fragment key={idx}>
            <EuiCallOut {...callOutProps}>
              <p>{message}</p>
              <EuiText size="xs">
                <EuiSpacer size="m" />
                <p data-test-subj="alertMeta">
                  <FormattedMessage
                    id="xpack.monitoring.cluster.overview.alertsPanel.lastCheckedTimeText"
                    defaultMessage="Last checked {updateDateTime} (triggered {duration} ago)"
                    values={{
                      updateDateTime: formatDateTimeLocal(alert.lastCheckedMS),
                      duration: formatTimestampToDuration(
                        alert.triggeredMS,
                        CALCULATE_DURATION_SINCE
                      ),
                    }}
                  />
                </p>
              </EuiText>
            </EuiCallOut>
            <EuiSpacer />
          </Fragment>
        );
      })
    : alerts.map((item, index) => (
        <TopAlertItem item={item} key={`top-alert-item-${index}`} index={index} />
      ));

  return (
    <div data-test-subj="clusterAlertsContainer">
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h2>
              <FormattedMessage
                id="xpack.monitoring.cluster.overview.alertsPanel.topClusterTitle"
                defaultMessage="Top cluster alerts"
              />
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            href={getSafeForExternalLink('#/alerts')}
            data-test-subj="viewAllAlerts"
          >
            <FormattedMessage
              id="xpack.monitoring.cluster.overview.alertsPanel.viewAllButtonLabel"
              defaultMessage="View all alerts"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {alertsList}
      <EuiSpacer size="xxl" />
    </div>
  );
}
