/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiDescriptionList } from '@elastic/eui';
import { EuiDescriptionListProps } from '@elastic/eui/src/components/description_list/description_list';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { APIReturnType } from '../../../services/rest/createCallApmApi';

type ServiceDetailsReturnType = APIReturnType<'GET /api/apm/services/{serviceName}/metadata/details'>;

interface Props {
  cloud: ServiceDetailsReturnType['cloud'];
}

export function CloudDetails({ cloud }: Props) {
  if (!cloud) {
    return null;
  }

  const listItems: EuiDescriptionListProps['listItems'] = [];
  if (cloud.provider) {
    listItems.push({
      title: i18n.translate(
        'xpack.apm.serviceIcons.serviceDetails.cloud.providerLabel',
        {
          defaultMessage: 'Cloud provider',
        }
      ),
      description: cloud.provider,
    });
  }

  if (!!cloud.availabilityZones?.length) {
    listItems.push({
      title: i18n.translate(
        'xpack.apm.serviceIcons.serviceDetails.cloud.availabilityZoneLabel',
        {
          defaultMessage:
            '{zones, plural, =0 {Availability zone} one {Availability zone} other {Availability zones}} ',
          values: { zones: cloud.availabilityZones.length },
        }
      ),
      description: (
        <ul>
          {cloud.availabilityZones.map((zone, index) => (
            <li key={index}>
              <EuiBadge color="hollow">{zone}</EuiBadge>
            </li>
          ))}
        </ul>
      ),
    });
  }

  if (cloud.machineTypes) {
    listItems.push({
      title: i18n.translate(
        'xpack.apm.serviceIcons.serviceDetails.cloud.machineTypesLabel',
        {
          defaultMessage:
            '{machineTypes, plural, =0{Machine type} one {Machine type} other {Machine types}} ',
          values: { machineTypes: cloud.machineTypes.length },
        }
      ),
      description: (
        <ul>
          {cloud.machineTypes.map((type, index) => (
            <li key={index}>
              <EuiBadge color="hollow">{type}</EuiBadge>
            </li>
          ))}
        </ul>
      ),
    });
  }

  if (cloud.projectName) {
    listItems.push({
      title: i18n.translate(
        'xpack.apm.serviceIcons.serviceDetails.cloud.projectIdLabel',
        {
          defaultMessage: 'Project ID',
        }
      ),
      description: cloud.projectName,
    });
  }

  return <EuiDescriptionList textStyle="reverse" listItems={listItems} />;
}
