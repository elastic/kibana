/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiPanel,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import moment from 'moment';
import { ALERT_STATUS_ACTIVE, ALERT_STATUS_RECOVERED } from '@kbn/rule-data-utils';
import { asDuration } from '../../../../common/utils/formatters';
import { PageHeaderProps } from '../types';
import { useKibana } from '../../../utils/kibana_react';
import { AlertStatusIndicator } from '../../../components/shared/alert_status_indicator';

export function AlertSummary({ alert }: PageHeaderProps) {
  const DEFAULT_DATE_FORMAT = 'MMM D, YYYY @ HH:mm:ss.SSS';
  const { triggersActionsUi } = useKibana().services;

  return (
    <>
      <EuiPanel color="subdued" hasBorder={false} paddingSize={'m'}>
        <EuiTitle size="xs">
          <div>
            <FormattedMessage
              id="xpack.observability.pages.alertDetails.alertSummary"
              defaultMessage="Alert Summary"
            />
          </div>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiPanel hasBorder={true} hasShadow={false}>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiTitle size="xxs">
                <h5>
                  <FormattedMessage
                    id="xpack.observability.pages.alertDetails.alertSummary.alertName"
                    defaultMessage="Alert ID"
                  />
                </h5>
              </EuiTitle>
              <EuiSpacer size="s" />
              <EuiText size="s" color="subdued">
                {alert['kibana.alert.uuid'] ?? '-'}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="xxs">
                <h5>
                  <FormattedMessage
                    id="xpack.observability.pages.alertDetails.alertSummary.averageValue"
                    defaultMessage="Actual Value"
                  />
                </h5>
              </EuiTitle>
              <EuiSpacer size="s" />
              <EuiText size="s" color="subdued">
                {alert['kibana.alert.evaluation.value'] ?? '-'}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="xxs">
                <h5>
                  <FormattedMessage
                    id="xpack.observability.pages.alertDetails.alertSummary.duration"
                    defaultMessage="Duration"
                  />
                </h5>
              </EuiTitle>
              <EuiSpacer size="s" />
              <EuiText size="s" color="subdued">
                {asDuration(Number(alert['kibana.alert.duration.us']))}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="xxs">
                <h5>
                  <FormattedMessage
                    id="xpack.observability.pages.alertDetails.alertSummary.alertStatus"
                    defaultMessage="Status"
                  />
                </h5>
              </EuiTitle>
              <EuiSpacer size="s" />
              {
                <AlertStatusIndicator
                  alertStatus={
                    alert['kibana.alert.status']?.toString() === ALERT_STATUS_ACTIVE
                      ? ALERT_STATUS_ACTIVE
                      : ALERT_STATUS_RECOVERED
                  }
                />
              }
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiTitle size="xxs">
                <h5>
                  <FormattedMessage
                    id="xpack.observability.pages.alertDetails.alertSummary.runbook"
                    defaultMessage="Relation"
                  />
                </h5>
              </EuiTitle>
              <EuiSpacer size="s" />
              <div>
                <EuiSpacer size="s" />
                {triggersActionsUi.getRuleTagBadge<'tagsOutPopover'>({
                  tagsOutPopover: true,
                  tags: ['Kibana'],
                })}
              </div>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="xxs">
                <h5>
                  <FormattedMessage
                    id="xpack.observability.pages.alertDetails.alertSummary.started"
                    defaultMessage="Started"
                  />
                </h5>
              </EuiTitle>
              <EuiSpacer size="s" />
              <EuiText size="s" color="subdued">
                {moment(alert['kibana.alert.start']?.toString()).format(DEFAULT_DATE_FORMAT)}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="xxs">
                <h5>
                  <FormattedMessage
                    id="xpack.observability.pages.alertDetails.alertSummary.lastStatusUpdate"
                    defaultMessage="Last Status Update"
                  />
                </h5>
              </EuiTitle>
              <EuiSpacer size="s" />
              <EuiText size="s" color="subdued">
                {moment(alert['@timestamp']?.toString()).fromNow()},&nbsp;
                {moment(alert['@timestamp']?.toString()).format(DEFAULT_DATE_FORMAT)}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              {alert['kibana.alert.rule.tags'] && (
                <>
                  <EuiTitle size="xxs">
                    <h5>
                      <FormattedMessage
                        id="xpack.observability.pages.alertDetails.alertSummary.tags"
                        defaultMessage="Tags"
                      />
                    </h5>
                  </EuiTitle>
                  <EuiSpacer size="s" />
                  <div>
                    <EuiSpacer size="s" />
                    {triggersActionsUi.getRuleTagBadge<'tagsOutPopover'>({
                      tagsOutPopover: true,
                      tags: alert['kibana.alert.rule.tags'],
                    })}
                  </div>
                </>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiPanel>
      <EuiSpacer size="xs" />
    </>
  );
}
