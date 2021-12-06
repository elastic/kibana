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
import { APIReturnType } from '../../../services/rest/create_call_apm_api';

type ServiceDetailsReturnType =
  APIReturnType<'GET /internal/apm/services/{serviceName}/metadata/details'>;

interface Props {
  service: ServiceDetailsReturnType['service'];
}

export function ServiceDetails({ service }: Props) {
  if (!service) {
    return null;
  }

  const listItems: EuiDescriptionListProps['listItems'] = [];
  if (!!service.versions?.length) {
    listItems.push({
      title: i18n.translate(
        'xpack.apm.serviceIcons.serviceDetails.service.versionLabel',
        {
          defaultMessage: 'Service version',
        }
      ),
      description: (
        <ul>
          {service.versions.map((version, index) => (
            <li key={index}>{version}</li>
          ))}
        </ul>
      ),
    });
  }

  if (service.runtime) {
    listItems.push({
      title: i18n.translate(
        'xpack.apm.serviceIcons.serviceDetails.service.runtimeLabel',
        {
          defaultMessage: 'Runtime name & version',
        }
      ),
      description: (
        <>
          {service.runtime.name} {service.runtime.version}
        </>
      ),
    });
  }

  if (service.framework) {
    listItems.push({
      title: i18n.translate(
        'xpack.apm.serviceIcons.serviceDetails.service.frameworkLabel',
        {
          defaultMessage: 'Framework name',
        }
      ),
      description: service.framework,
    });
  }

  if (service.agent) {
    listItems.push({
      title: i18n.translate(
        'xpack.apm.serviceIcons.serviceDetails.service.agentLabel',
        {
          defaultMessage: 'Agent name & version',
        }
      ),
      description: (
        <>
          {service.agent.name} {service.agent.version}
        </>
      ),
    });
  }

  return <EuiDescriptionList textStyle="reverse" listItems={listItems} />;
}
