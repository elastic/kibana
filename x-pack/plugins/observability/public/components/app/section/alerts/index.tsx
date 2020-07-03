/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup } from '@elastic/eui';
import { EuiLink } from '@elastic/eui';
import { EuiBadge } from '@elastic/eui';
import { EuiFlexItem } from '@elastic/eui';
import { EuiText } from '@elastic/eui';
import { EuiIcon } from '@elastic/eui';
import moment from 'moment';
import { EuiHorizontalRule } from '@elastic/eui';
import { SectionContainer } from '..';

const alerts = [
  {
    id: '1',
    name: 'Error rate | opbeans-java',
    alertTypeId: 'apm.error_rate',
    tags: ['apm', 'service.name:opbeans-java'],
    updatedAt: '2020-07-03T14:27:51.488Z',
    muteAll: true,
  },
  {
    id: '2',
    name: 'Error rate | opbeans-java',
    alertTypeId: 'apm.error_rate',
    tags: ['apm', 'service.name:opbeans-java'],
    updatedAt: '2020-07-02T14:27:51.488Z',
    muteAll: true,
  },
  {
    id: '3',
    name: 'Error rate | opbeans-java',
    alertTypeId: 'apm.error_rate',
    tags: ['apm', 'service.name:opbeans-java'],
    updatedAt: '2020-06-25T14:27:51.488Z',
    muteAll: true,
  },
  {
    id: '4',
    name: 'Error rate | opbeans-java',
    alertTypeId: 'apm.error_rate',
    tags: ['apm', 'service.name:opbeans-java'],
    updatedAt: '2020-03-25T14:27:51.488Z',
    muteAll: true,
  },
];

export const AlertsSection = () => {
  return (
    <SectionContainer
      title="Alerts"
      subtitle={i18n.translate('xpack.observability.overview.alerts.subtitle', {
        defaultMessage: 'Recent activity',
      })}
      appLink={'/app/management/insightsAndAlerting/triggersActions/alerts'}
      hasError={false}
    >
      {alerts.map((alert, index) => {
        const isLastElement = index === alerts.length - 1;
        return (
          <EuiFlexGroup direction="column" gutterSize="s" key={alert.id}>
            <EuiFlexItem>
              <EuiLink href="www.elastic.co">{alert.name}</EuiLink>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="xs">
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">{alert.alertTypeId}</EuiBadge>
                </EuiFlexItem>
                {alert.tags.map((tag, index) => {
                  return (
                    <EuiFlexItem key={index} grow={false}>
                      <EuiBadge color="default">{tag}</EuiBadge>
                    </EuiFlexItem>
                  );
                })}
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiText color="subdued" size="xs">
                    Updated {moment.duration(moment().diff(alert.updatedAt)).humanize()} ago
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiIcon type="minusInCircle" />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            {!isLastElement && <EuiHorizontalRule margin="xs" />}
          </EuiFlexGroup>
        );
      })}
    </SectionContainer>
  );
};
