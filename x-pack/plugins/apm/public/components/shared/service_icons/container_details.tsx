/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDescriptionList, EuiBadge } from '@elastic/eui';
import { EuiDescriptionListProps } from '@elastic/eui/src/components/description_list/description_list';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { asInteger } from '../../../../common/utils/formatters';
import { APIReturnType } from '../../../services/rest/create_call_apm_api';

type ServiceDetailsReturnType =
  APIReturnType<'GET /internal/apm/services/{serviceName}/metadata/details'>;

interface Props {
  container: ServiceDetailsReturnType['container'];
  kubernetes?: ServiceDetailsReturnType['kubernetes'];
}

export function ContainerDetails({ container, kubernetes }: Props) {
  if (!container) {
    return null;
  }

  const listItems: EuiDescriptionListProps['listItems'] = [];
  if (container?.image?.name) {
    listItems.push({
      title: i18n.translate(
        'xpack.apm.serviceIcons.serviceDetails.container.image.name',
        { defaultMessage: 'Container name' }
      ),
      description: container.image.name,
    });
  }

  if (kubernetes?.namespace?.name) {
    listItems.push({
      title: i18n.translate(
        'xpack.apm.serviceIcons.serviceDetails.container.namespace',
        { defaultMessage: 'Namespace' }
      ),
      description: kubernetes?.namespace.name,
    });
  }

  if (kubernetes?.deployment?.name) {
    listItems.push({
      title: i18n.translate(
        'xpack.apm.serviceIcons.serviceDetails.container.deployment.name',
        { defaultMessage: 'Deployment name' }
      ),
      description: kubernetes.deployment.name,
    });
  }

  if (container.os) {
    listItems.push({
      title: i18n.translate(
        'xpack.apm.serviceIcons.serviceDetails.container.osLabel',
        {
          defaultMessage: 'OS',
        }
      ),
      description: container.os,
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

  if (kubernetes?.labels) {
    listItems.push({
      title: i18n.translate(
        'xpack.apm.serviceIcons.serviceDetails.container.pod.name',
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
