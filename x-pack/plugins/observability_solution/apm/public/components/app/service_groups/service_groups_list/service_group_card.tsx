/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiToolTip } from '@elastic/eui';
import {
  EuiAvatar,
  EuiBadge,
  EuiCard,
  EuiCardProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ServiceGroup, SERVICE_GROUP_COLOR_DEFAULT } from '../../../../../common/service_groups';
import { useObservabilityActiveAlertsHref } from '../../../shared/links/kibana';
import { ServiceStat } from './service_stat';

interface Props {
  serviceGroup: ServiceGroup;
  href?: string;
  serviceGroupCounts?: { services: number; alerts: number };
  isLoading: boolean;
}

export function ServiceGroupsCard({ serviceGroup, href, serviceGroupCounts, isLoading }: Props) {
  const isMobile = useIsWithinBreakpoints(['xs', 's']);

  const activeAlertsHref = useObservabilityActiveAlertsHref(serviceGroup.kuery);
  const cardProps: EuiCardProps = {
    style: { width: isMobile ? '100%' : 286 },
    icon: (
      <>
        <EuiAvatar
          name={serviceGroup.groupName}
          color={serviceGroup.color || SERVICE_GROUP_COLOR_DEFAULT}
          size="l"
        />
      </>
    ),
    title: serviceGroup.groupName,
    description: (
      <EuiFlexGroup direction={'column'} gutterSize="m">
        <EuiFlexItem>
          <EuiText size="s">
            {serviceGroup.description ||
              i18n.translate('xpack.apm.serviceGroups.cardsList.emptyDescription', {
                defaultMessage: 'No description available',
              })}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexGroup alignItems="center">
          <ServiceStat loading={isLoading}>
            <EuiFlexItem>
              <EuiText size="xs" textAlign="left">
                {serviceGroupCounts !== undefined &&
                  i18n.translate('xpack.apm.serviceGroups.cardsList.serviceCount', {
                    defaultMessage:
                      '{servicesCount} {servicesCount, plural, one {service} other {services}}',
                    values: { servicesCount: serviceGroupCounts.services },
                  })}
              </EuiText>
            </EuiFlexItem>
          </ServiceStat>
          <ServiceStat loading={isLoading} grow={isLoading}>
            {serviceGroupCounts && serviceGroupCounts.alerts > 0 && (
              <EuiToolTip
                position="bottom"
                content={i18n.translate(
                  'xpack.apm.home.serviceGroups.tooltip.activeAlertsExplanation',
                  {
                    defaultMessage: 'Active alerts',
                  }
                )}
              >
                <EuiBadge
                  iconType="warning"
                  color="danger"
                  href={activeAlertsHref}
                  {...({
                    onClick(e: React.SyntheticEvent) {
                      e.stopPropagation(); // prevents extra click thru to EuiCard's href destination
                    },
                  } as object)} // workaround for type check that prevents href + onclick
                >
                  {i18n.translate('xpack.apm.serviceGroups.cardsList.alertCount', {
                    defaultMessage:
                      '{alertsCount} {alertsCount, plural, one {alert} other {alerts}}',
                    values: { alertsCount: serviceGroupCounts.alerts },
                  })}
                </EuiBadge>
              </EuiToolTip>
            )}
          </ServiceStat>
        </EuiFlexGroup>
      </EuiFlexGroup>
    ),
    href,
  };

  return (
    <EuiFlexItem key={serviceGroup.groupName} grow={false}>
      <EuiCard layout="vertical" {...cardProps} data-test-subj="serviceGroupCard" />
    </EuiFlexItem>
  );
}
