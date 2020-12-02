/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup } from '@elastic/eui';
import { EuiFlexItem } from '@elastic/eui';
import { EuiBadge } from '@elastic/eui';
import { EuiStat } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { APIReturnType } from '../../../../services/rest/createCallApmApi';
import { IconPopover } from './icon_popover';

export type ServiceDetailsApiResponse = APIReturnType<'GET /api/apm/services/{serviceName}'>;

interface Props {
  serviceDetails: ServiceDetailsApiResponse;
}

export function CloudDetails({ serviceDetails }: Props) {
  if (!serviceDetails || !serviceDetails.cloud) {
    return null;
  }

  return (
    <IconPopover
      icon="cloudSunny"
      title={i18n.translate('xpack.apm.serviceNameHeader.cloud', {
        defaultMessage: 'Cloud',
      })}
    >
      <EuiFlexGroup direction="column" gutterSize="s">
        {serviceDetails.cloud.provider && (
          <EuiFlexItem>
            <EuiStat
              title={serviceDetails.cloud.provider}
              description={i18n.translate(
                'xpack.apm.serviceNameHeader.cloud.provider',
                { defaultMessage: 'Cloud provider' }
              )}
              titleSize="xxs"
            />
          </EuiFlexItem>
        )}
        {serviceDetails.cloud.availability_zone && (
          <EuiFlexItem>
            <EuiStat
              title={
                <EuiBadge color="hollow">
                  {serviceDetails.cloud.availability_zone}
                </EuiBadge>
              }
              description={i18n.translate(
                'xpack.apm.serviceNameHeader.cloud.zone',
                { defaultMessage: 'Availability zone' }
              )}
              titleSize="xxs"
            />
          </EuiFlexItem>
        )}
        {serviceDetails.cloud.machine.type && (
          <EuiFlexItem>
            <EuiStat
              title={
                <EuiBadge color="hollow">
                  {serviceDetails.cloud.machine.type}
                </EuiBadge>
              }
              description={i18n.translate(
                'xpack.apm.serviceNameHeader.cloud.machine',
                { defaultMessage: 'Machine type' }
              )}
              titleSize="xxs"
            />
          </EuiFlexItem>
        )}
        {serviceDetails.cloud.project.name && (
          <EuiFlexItem>
            <EuiStat
              title={serviceDetails.cloud.project.name}
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
