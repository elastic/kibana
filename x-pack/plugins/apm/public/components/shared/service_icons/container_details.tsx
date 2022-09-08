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

  if (container?.image) {
    listItems.push({
      title: i18n.translate(
        'xpack.apm.serviceIcons.serviceDetails.container.image.name',
        { defaultMessage: 'Container image' }
      ),
      description: container.image,
    });
  }

  if (kubernetes?.deployment && kubernetes?.deployment.length > 0) {
    listItems.push({
      title: i18n.translate(
        'xpack.apm.serviceIcons.serviceDetails.kubernetes.deployments',
        { defaultMessage: 'Deployments' }
      ),
      description: (
        <ul>
          {kubernetes.deployment.map((deployment, index) => (
            <li key={index}>
              <EuiBadge color="hollow">{deployment}</EuiBadge>
            </li>
          ))}
        </ul>
      ),
    });
  }

  if (kubernetes?.namespace && kubernetes?.namespace.length > 0) {
    listItems.push({
      title: i18n.translate(
        'xpack.apm.serviceIcons.serviceDetails.kubernetes.namespaces',
        { defaultMessage: 'Namespaces' }
      ),
      description: (
        <ul>
          {kubernetes.namespace.map((namespace, index) => (
            <li key={index}>
              <EuiBadge color="hollow">{namespace}</EuiBadge>
            </li>
          ))}
        </ul>
      ),
    });
  }

  if (kubernetes?.replicaset && kubernetes?.replicaset.length > 0) {
    listItems.push({
      title: i18n.translate(
        'xpack.apm.serviceIcons.serviceDetails.kubernetes.replicasets',
        { defaultMessage: 'Replicasets' }
      ),
      description: (
        <ul>
          {kubernetes.replicaset.map((replicaset, index) => (
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

  if (kubernetes?.labels && kubernetes?.labels.length > 0) {
    listItems.push({
      title: i18n.translate(
        'xpack.apm.serviceIcons.serviceDetails.kubernetes.labels',
        { defaultMessage: 'Labels' }
      ),
      description: (
        <ul>
          {kubernetes.labels.map((label, index) => (
            <li key={index}>
              <EuiBadge color="hollow">{label}</EuiBadge>
            </li>
          ))}
        </ul>
      ),
    });
  }

  return <EuiDescriptionList textStyle="reverse" listItems={listItems} />;
}
