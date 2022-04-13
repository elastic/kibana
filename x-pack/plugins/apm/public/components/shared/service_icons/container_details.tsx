/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDescriptionList } from '@elastic/eui';
import { EuiDescriptionListProps } from '@elastic/eui/src/components/description_list/description_list';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { asInteger } from '../../../../common/utils/formatters';
import { APIReturnType } from '../../../services/rest/create_call_apm_api';

type ServiceDetailsReturnType =
  APIReturnType<'GET /internal/apm/services/{serviceName}/metadata/details'>;

interface Props {
  container: ServiceDetailsReturnType['container'];
}

export function ContainerDetails({ container }: Props) {
  if (!container) {
    return null;
  }

  const listItems: EuiDescriptionListProps['listItems'] = [];
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

  if (container.isContainerized !== undefined) {
    listItems.push({
      title: i18n.translate(
        'xpack.apm.serviceIcons.serviceDetails.container.containerizedLabel',
        { defaultMessage: 'Containerized' }
      ),
      description: container.isContainerized
        ? i18n.translate(
            'xpack.apm.serviceIcons.serviceDetails.container.yesLabel',
            {
              defaultMessage: 'Yes',
            }
          )
        : i18n.translate(
            'xpack.apm.serviceIcons.serviceDetails.container.noLabel',
            {
              defaultMessage: 'No',
            }
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

  if (container.type) {
    listItems.push({
      title: i18n.translate(
        'xpack.apm.serviceIcons.serviceDetails.container.orchestrationLabel',
        { defaultMessage: 'Orchestration' }
      ),
      description: container.type,
    });
  }

  return <EuiDescriptionList textStyle="reverse" listItems={listItems} />;
}
