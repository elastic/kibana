/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiStat } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { APIReturnType } from '../../../../services/rest/createCallApmApi';
import { GroupBadges } from '../../group_badges';
import { IconPopover } from './icon_popover';

export type ServiceDetailsApiResponse = APIReturnType<'GET /api/apm/services/{serviceName}'>;

interface Props {
  cloud: ServiceDetailsApiResponse['cloud'];
}
const icons: Record<string, string> = {
  gcp: 'logoGCP',
  aws: 'logoAWS',
  azure: 'logoAzure',
};

function getIcon(provider?: string) {
  return provider ? icons[provider] : 'cloudSunny';
}

export function CloudDetails({ cloud }: Props) {
  if (!cloud) {
    return null;
  }

  return (
    <IconPopover
      icon={getIcon(cloud.provider)}
      title={i18n.translate('xpack.apm.serviceNameHeader.cloud', {
        defaultMessage: 'Cloud',
      })}
    >
      <EuiFlexGroup direction="column" gutterSize="s">
        {cloud.provider && (
          <EuiFlexItem>
            <EuiStat
              title={cloud.provider}
              description={i18n.translate(
                'xpack.apm.serviceNameHeader.cloud.provider',
                { defaultMessage: 'Cloud provider' }
              )}
              titleSize="xxs"
            />
          </EuiFlexItem>
        )}
        {cloud.availabilityZones && (
          <EuiFlexItem>
            <EuiStat
              title={
                <GroupBadges
                  values={cloud.availabilityZones}
                  tooltipLabel={i18n.translate(
                    'xpack.apm.serviceNameHeader.cloud.zones',
                    {
                      defaultMessage:
                        '{zones, plural, =0 {0 Zones} one {1 Zone} other {# Zones}} ',
                      values: { zones: cloud.availabilityZones.length },
                    }
                  )}
                />
              }
              description={i18n.translate(
                'xpack.apm.serviceNameHeader.cloud.zone',
                {
                  defaultMessage:
                    '{zones, plural, =0 {Availability zone} one {Availability zone} other {Availability zones}} ',
                  values: { zones: cloud.availabilityZones.length },
                }
              )}
              titleSize="xxs"
            />
          </EuiFlexItem>
        )}
        {cloud.machineTypes && (
          <EuiFlexItem>
            <EuiStat
              title={
                <GroupBadges
                  values={cloud.machineTypes}
                  tooltipLabel={i18n.translate(
                    'xpack.apm.serviceNameHeader.cloud.zones',
                    {
                      defaultMessage:
                        '{types, plural, =0 {0 Type} one {1 Type} other {# Types}} ',
                      values: { types: cloud.machineTypes.length },
                    }
                  )}
                />
              }
              description={i18n.translate(
                'xpack.apm.serviceNameHeader.cloud.machine',
                {
                  defaultMessage:
                    '{machineTypes, plural, =0{Machine type} one {Machine type} other {Machine types}} ',
                  values: { machineTypes: cloud.machineTypes.length },
                }
              )}
              titleSize="xxs"
            />
          </EuiFlexItem>
        )}
        {cloud.projectName && (
          <EuiFlexItem>
            <EuiStat
              title={cloud.projectName}
              description={i18n.translate(
                'xpack.apm.serviceNameHeader.cloud.project',
                { defaultMessage: 'Project ID' }
              )}
              titleSize="xxs"
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </IconPopover>
  );
}
