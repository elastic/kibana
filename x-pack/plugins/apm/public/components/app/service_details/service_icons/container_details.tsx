/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiDescriptionList } from '@elastic/eui';
import { EuiDescriptionListProps } from '@elastic/eui/src/components/description_list/description_list';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { APIReturnType } from '../../../../services/rest/createCallApmApi';

type ServiceDetailsReturnType = APIReturnType<'GET /api/apm/services/{serviceName}/metadata/details'>;

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
      title: i18n.translate('xpack.apm.serviceNameHeader.container.os', {
        defaultMessage: 'OS',
      }),
      description: container.os,
    });
  }

  if (container.isContainerized !== undefined) {
    listItems.push({
      title: i18n.translate(
        'xpack.apm.serviceNameHeader.container.containerized',
        { defaultMessage: 'Containerized' }
      ),
      description: container.isContainerized
        ? i18n.translate('xpack.apm.serviceNameHeader.container.yes', {
            defaultMessage: 'Yes',
          })
        : i18n.translate('xpack.apm.serviceNameHeader.container.no', {
            defaultMessage: 'No',
          }),
    });
  }

  if (container.avgNumberInstances) {
    listItems.push({
      title: i18n.translate(
        'xpack.apm.serviceNameHeader.container.avgNumberInstances',
        { defaultMessage: 'Avg. number of instances' }
      ),
      description: Math.round(container.avgNumberInstances),
    });
  }

  if (container.orchestration) {
    listItems.push({
      title: i18n.translate(
        'xpack.apm.serviceNameHeader.container.orchestration',
        { defaultMessage: 'Orchestration' }
      ),
      description: container.orchestration,
    });
  }

  return <EuiDescriptionList textStyle="reverse" listItems={listItems} />;
}
