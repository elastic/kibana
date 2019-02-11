/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InjectedIntl } from '@kbn/i18n/react';

interface Lookup {
  [id: string]: string;
}

export const fieldToName = (field: string, intl: InjectedIntl) => {
  const LOOKUP: Lookup = {
    'kubernetes.namespace': intl.formatMessage({
      id: 'xpack.infra.groupByDisplayNames.kubernetesNamespace',
      defaultMessage: 'Namespace',
    }),
    'kubernetes.node.name': intl.formatMessage({
      id: 'xpack.infra.groupByDisplayNames.kubernetesNodeName',
      defaultMessage: 'Node',
    }),
    'host.name': intl.formatMessage({
      id: 'xpack.infra.groupByDisplayNames.hostName',
      defaultMessage: 'Host',
    }),
    'meta.cloud.availability_zone': intl.formatMessage({
      id: 'xpack.infra.groupByDisplayNames.availabilityZone',
      defaultMessage: 'Availability Zone',
    }),
    'meta.cloud.machine_type': intl.formatMessage({
      id: 'xpack.infra.groupByDisplayNames.machineType',
      defaultMessage: 'Machine Type',
    }),
    'meta.cloud.project_id': intl.formatMessage({
      id: 'xpack.infra.groupByDisplayNames.projectID',
      defaultMessage: 'Project ID',
    }),
    'meta.cloud.provider': intl.formatMessage({
      id: 'xpack.infra.groupByDisplayNames.provider',
      defaultMessage: 'Cloud Provider',
    }),
  };
  return LOOKUP[field] || field;
};
