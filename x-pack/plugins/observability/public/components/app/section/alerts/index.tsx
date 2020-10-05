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
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import React, { useEffect, useState } from 'react';
import { EuiSelect } from '@elastic/eui';
import { uniqBy } from 'lodash';
import { usePluginContext } from '../../../../hooks/use_plugin_context';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { getObservabilityAlerts } from '../../../../services/get_observability_alerts';
import { SectionContainer } from '..';

const ALL_TYPES = 'ALL_TYPES';
const allTypes = {
  value: ALL_TYPES,
  text: i18n.translate('xpack.observability.overview.alert.allTypes', {
    defaultMessage: 'All types',
  }),
};

interface Props {
  setAlertEmptySection: (val: boolean) => void;
}

export function AlertsSection({ setAlertEmptySection }: Props) {
  const { core } = usePluginContext();
  const [filter, setFilter] = useState(ALL_TYPES);

  const { data: alerts = [], status } = useFetcher(() => {
    return getObservabilityAlerts({ core });
  }, [core]);

  useEffect(() => {
    setAlertEmptySection(status !== FETCH_STATUS.FAILURE && !alerts.length);
  }, [alerts, status, setAlertEmptySection]);

  const filterOptions = uniqBy(alerts, (alert) => alert.consumer).map(({ consumer }) => ({
    value: consumer,
    text: consumer,
  }));

  if (!alerts.length) {
    return null;
  }
  return (
    <EuiFlexItem grow={3}>
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
                    <EuiSpacer size="s" />
                    <EuiFlexItem>
                      <EuiLink
                        href={core.http.basePath.prepend(
                          `/app/management/insightsAndAlerting/triggersActions/alert/${alert.id}`
                        )}
                      >
                        <EuiText size="s">{alert.name}</EuiText>
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
    </EuiFlexItem>
  );
}
