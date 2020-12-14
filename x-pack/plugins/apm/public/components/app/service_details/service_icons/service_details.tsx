/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiDescriptionList } from '@elastic/eui';
import { EuiDescriptionListProps } from '@elastic/eui/src/components/description_list/description_list';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useServiceDetailsFetcher } from './use_service_details_fetcher';

export function ServiceDetails() {
  const { details } = useServiceDetailsFetcher();

  if (!details?.service) {
    return null;
  }

  const listItems: EuiDescriptionListProps['listItems'] = [];
  if (!!details.service.versions?.length) {
    listItems.push({
      title: i18n.translate('xpack.apm.serviceNameHeader.service.version', {
        defaultMessage: 'Service version',
      }),
      description: (
        <ul>
          {details.service.versions.map((version, index) => (
            <li key={index}>{version}</li>
          ))}
        </ul>
      ),
    });
  }

  if (details.service.runtime) {
    listItems.push({
      title: i18n.translate('xpack.apm.serviceNameHeader.service.runtime', {
        defaultMessage: 'Runtime name & version',
      }),
      description: (
        <>
          {details.service.runtime.name} {details.service.runtime.version}
        </>
      ),
    });
  }

  if (details.service.framework) {
    listItems.push({
      title: i18n.translate('xpack.apm.serviceNameHeader.service.framework', {
        defaultMessage: 'Framework name',
      }),
      description: details.service.framework,
    });
  }

  if (details.service.agent) {
    listItems.push({
      title: i18n.translate('xpack.apm.serviceNameHeader.service.agent', {
        defaultMessage: 'Agent name & version',
      }),
      description: (
        <>
          {details.service.agent.name} {details.service.agent.version}
        </>
      ),
    });
  }

  return <EuiDescriptionList textStyle="reverse" listItems={listItems} />;
}
