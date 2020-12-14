/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge } from '@elastic/eui';
import { EuiDescriptionList } from '@elastic/eui';
import { EuiDescriptionListProps } from '@elastic/eui/src/components/description_list/description_list';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useServiceDetailsFetcher } from './use_service_details_fetcher';

export function CloudDetails() {
  const { details } = useServiceDetailsFetcher();

  if (!details?.cloud) {
    return null;
  }

  const listItems: EuiDescriptionListProps['listItems'] = [];
  if (details.cloud.provider) {
    listItems.push({
      title: i18n.translate('xpack.apm.serviceNameHeader.cloud.provider', {
        defaultMessage: 'Cloud provider',
      }),
      description: details.cloud.provider,
    });
  }

  if (!!details.cloud.availabilityZones?.length) {
    listItems.push({
      title: i18n.translate('xpack.apm.serviceNameHeader.cloud.zone', {
        defaultMessage:
          '{zones, plural, =0 {Availability zone} one {Availability zone} other {Availability zones}} ',
        values: { zones: details.cloud.availabilityZones.length },
      }),
      description: (
        <ul>
          {details.cloud.availabilityZones.map((zone, index) => (
            <li key={index}>
              <EuiBadge color="hollow">{zone}</EuiBadge>
            </li>
          ))}
        </ul>
      ),
    });
  }

  if (details.cloud.machineTypes) {
    listItems.push({
      title: i18n.translate('xpack.apm.serviceNameHeader.cloud.machine', {
        defaultMessage:
          '{machineTypes, plural, =0{Machine type} one {Machine type} other {Machine types}} ',
        values: { machineTypes: details.cloud.machineTypes.length },
      }),
      description: (
        <ul>
          {details.cloud.machineTypes.map((type, index) => (
            <li key={index}>
              <EuiBadge color="hollow">{type}</EuiBadge>
            </li>
          ))}
        </ul>
      ),
    });
  }

  if (details.cloud.projectName) {
    listItems.push({
      title: i18n.translate('xpack.apm.serviceNameHeader.cloud.project', {
        defaultMessage: 'Project ID',
      }),
      description: details.cloud.projectName,
    });
  }

  return <EuiDescriptionList textStyle="reverse" listItems={listItems} />;
}
