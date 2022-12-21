/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiDescriptionList,
  EuiDescriptionListProps,
  EuiBadge,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { asInteger } from '../../../../common/utils/formatters';
import { APIReturnType } from '../../../services/rest/create_call_apm_api';

type ServiceDetailsReturnType =
  APIReturnType<'GET /internal/apm/services/{serviceName}/metadata/details'>;

interface Props {
  container: ServiceDetailsReturnType['container'];
  kubernetes: ServiceDetailsReturnType['kubernetes'];
}

export function ContainerDetails({ container, kubernetes }: Props) {
  if (!container) {
    return null;
  }

  const listItems: EuiDescriptionListProps['listItems'] = [];

  if (kubernetes?.containerImages && kubernetes?.containerImages.length > 0) {
    listItems.push({
      title: i18n.translate(
        'xpack.apm.serviceIcons.serviceDetails.container.image.name',
        { defaultMessage: 'Container images' }
      ),
      description: (
        <ul>
          {kubernetes.containerImages.map((deployment, index) => (
            <li key={index}>
              <EuiBadge color="hollow">{deployment}</EuiBadge>
            </li>
          ))}
        </ul>
      ),
    });
  }

  if (container.os) {
    listItems.push({
      title: i18n.translate(
        'xpack.apm.serviceIcons.serviceDetails.container.os.label',
        {
          defaultMessage: 'OS',
        }
      ),
      description: container.os,
    });
  }

  if (kubernetes?.deployments && kubernetes?.deployments.length > 0) {
    listItems.push({
      title: i18n.translate(
        'xpack.apm.serviceIcons.serviceDetails.kubernetes.deployments',
        { defaultMessage: 'Deployments' }
      ),
      description: (
        <ul>
          {kubernetes.deployments.map((deployment, index) => (
            <li key={index}>
              <EuiBadge color="hollow">{deployment}</EuiBadge>
            </li>
          ))}
        </ul>
      ),
    });
  }

  if (kubernetes?.namespaces && kubernetes?.namespaces.length > 0) {
    listItems.push({
      title: i18n.translate(
        'xpack.apm.serviceIcons.serviceDetails.kubernetes.namespaces',
        { defaultMessage: 'Namespaces' }
      ),
      description: (
        <ul>
          {kubernetes.namespaces.map((namespace, index) => (
            <li key={index}>
              <EuiBadge color="hollow">{namespace}</EuiBadge>
            </li>
          ))}
        </ul>
      ),
    });
  }

  if (kubernetes?.replicasets && kubernetes?.replicasets.length > 0) {
    listItems.push({
      title: i18n.translate(
        'xpack.apm.serviceIcons.serviceDetails.kubernetes.replicasets',
        { defaultMessage: 'Replicasets' }
      ),
      description: (
        <ul>
          {kubernetes.replicasets.map((replicaset, index) => (
            <li key={index}>
              <EuiBadge color="hollow">{replicaset}</EuiBadge>
            </li>
          ))}
        </ul>
      ),
    });
  }

  if (container.totalNumberInstances) {
    listItems.push({
      title: i18n.translate(
        'xpack.apm.serviceIcons.serviceDetails.container.totalNumberInstancesLabel',
        { defaultMessage: 'Total number of instances' }
      ),
      description: asInteger(container.totalNumberInstances),
    });
  }

  return <EuiDescriptionList textStyle="reverse" listItems={listItems} />;
}
