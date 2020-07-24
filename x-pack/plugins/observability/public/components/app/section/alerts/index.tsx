/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIconTip,
  EuiLink,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import React, { useState } from 'react';
import { EuiSelect } from '@elastic/eui';
import { uniqBy } from 'lodash';
import { Alert } from '../../../../../../alerts/common';
import { usePluginContext } from '../../../../hooks/use_plugin_context';
import { SectionContainer } from '..';

const ALL_TYPES = 'ALL_TYPES';
const allTypes = {
  value: ALL_TYPES,
  text: i18n.translate('xpack.observability.overview.alert.allTypes', {
    defaultMessage: 'All types',
  }),
};

interface Props {
  alerts: Alert[];
}

export const AlertsSection = ({ alerts }: Props) => {
  const { core } = usePluginContext();
  const [filter, setFilter] = useState(ALL_TYPES);

  const filterOptions = uniqBy(alerts, (alert) => alert.consumer).map(({ consumer }) => ({
    value: consumer,
    text: consumer,
  }));

  return (
    <SectionContainer
      title={i18n.translate('xpack.observability.overview.alerts.title', {
        defaultMessage: 'Alerts',
      })}
      appLink={{
        href: '/app/management/insightsAndAlerting/triggersActions/alerts',
        label: i18n.translate('xpack.observability.overview.alert.appLink', {
          defaultMessage: 'Manage alerts',
        }),
      }}
      hasError={false}
    >
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiSelect
                compressed
                id="filterAlerts"
                options={[allTypes, ...filterOptions]}
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                prepend={i18n.translate('xpack.observability.overview.alert.view', {
                  defaultMessage: 'View',
                })}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiHorizontalRule margin="xs" />
        <EuiFlexItem>
          {alerts
            .filter((alert) => filter === ALL_TYPES || alert.consumer === filter)
            .map((alert, index) => {
              const isLastElement = index === alerts.length - 1;
              return (
                <EuiFlexGroup direction="column" gutterSize="s" key={alert.id}>
                  <EuiFlexItem>
                    <EuiLink
                      href={core.http.basePath.prepend(
                        `/app/management/insightsAndAlerting/triggersActions/alert/${alert.id}`
                      )}
                    >
                      {alert.name}
                    </EuiLink>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup gutterSize="xs">
                      <EuiFlexItem grow={false}>
                        <EuiBadge color="hollow">{alert.alertTypeId}</EuiBadge>
                      </EuiFlexItem>
                      {alert.tags.map((tag, idx) => {
                        return (
                          <EuiFlexItem key={idx} grow={false}>
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
                      {alert.muteAll && (
                        <EuiFlexItem grow={false}>
                          <EuiIconTip
                            type="minusInCircle"
                            content={i18n.translate('xpack.observability.overview.alerts.muted', {
                              defaultMessage: 'Muted',
                            })}
                          />
                        </EuiFlexItem>
                      )}
                    </EuiFlexGroup>
                  </EuiFlexItem>
                  {!isLastElement && <EuiHorizontalRule margin="xs" />}
                </EuiFlexGroup>
              );
            })}
        </EuiFlexItem>
      </EuiFlexGroup>
    </SectionContainer>
  );
};
