/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiAvatar,
  EuiCard,
  EuiCardProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import {
  ServiceGroup,
  SERVICE_GROUP_COLOR_DEFAULT,
} from '../../../../../common/service_groups';

interface Props {
  serviceGroup: ServiceGroup;
  hideServiceCount?: boolean;
  onClick?: () => void;
  href?: string;
}

export function ServiceGroupsCard({
  serviceGroup,
  hideServiceCount = false,
  onClick,
  href,
}: Props) {
  const cardProps: EuiCardProps = {
    style: { width: 286, height: 186 },
    icon: (
      <EuiAvatar
        name={serviceGroup.groupName}
        color={serviceGroup.color || SERVICE_GROUP_COLOR_DEFAULT}
        size="l"
      />
    ),
    title: serviceGroup.groupName,
    description: (
      <EuiFlexGroup direction={'column'} gutterSize="m">
        <EuiFlexItem>
          <EuiText size="s">
            {serviceGroup.description ||
              i18n.translate(
                'xpack.apm.serviceGroups.cardsList.emptyDescription',
                { defaultMessage: 'No description available' }
              )}
          </EuiText>
        </EuiFlexItem>
        {!hideServiceCount && (
          <EuiFlexItem>
            <EuiText size="s">
              {i18n.translate(
                'xpack.apm.serviceGroups.cardsList.serviceCount',
                {
                  defaultMessage:
                    '{servicesCount} {servicesCount, plural, one {service} other {services}}',
                  values: { servicesCount: serviceGroup.serviceNames.length },
                }
              )}
            </EuiText>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    ),
    onClick,
    href,
  };

  return (
    <EuiFlexItem key={serviceGroup.groupName}>
      <EuiCard layout="vertical" {...cardProps} />
    </EuiFlexItem>
  );
}
