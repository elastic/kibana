/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
export const CPUUsage = i18n.translate('xpack.infra.waffle.metricOptions.cpuUsageText', {
  defaultMessage: 'CPU usage',
});

export const MemoryUsage = i18n.translate('xpack.infra.waffle.metricOptions.memoryUsageText', {
  defaultMessage: 'Memory usage',
});

export const InboundTraffic = i18n.translate(
  'xpack.infra.waffle.metricOptions.inboundTrafficText',
  {
    defaultMessage: 'Inbound traffic',
  }
);

export const OutboundTraffic = i18n.translate(
  'xpack.infra.waffle.metricOptions.outboundTrafficText',
  {
    defaultMessage: 'Outbound traffic',
  }
);

export const LogRate = i18n.translate('xpack.infra.waffle.metricOptions.hostLogRateText', {
  defaultMessage: 'Log rate',
});

export const Load = i18n.translate('xpack.infra.waffle.metricOptions.loadText', {
  defaultMessage: 'Load',
});

interface Lookup {
  [id: string]: string;
}

export const fieldToName = (field: string) => {
  const LOOKUP: Lookup = {
    'kubernetes.namespace': i18n.translate('xpack.infra.groupByDisplayNames.kubernetesNamespace', {
      defaultMessage: 'Namespace',
    }),
    'kubernetes.node.name': i18n.translate('xpack.infra.groupByDisplayNames.kubernetesNodeName', {
      defaultMessage: 'Node',
    }),
    'host.name': i18n.translate('xpack.infra.groupByDisplayNames.hostName', {
      defaultMessage: 'Host',
    }),
    'cloud.availability_zone': i18n.translate('xpack.infra.groupByDisplayNames.availabilityZone', {
      defaultMessage: 'Availability zone',
    }),
    'cloud.machine.type': i18n.translate('xpack.infra.groupByDisplayNames.machineType', {
      defaultMessage: 'Machine type',
    }),
    'cloud.project.id': i18n.translate('xpack.infra.groupByDisplayNames.projectID', {
      defaultMessage: 'Project ID',
    }),
    'cloud.provider': i18n.translate('xpack.infra.groupByDisplayNames.provider', {
      defaultMessage: 'Cloud provider',
    }),
    'service.type': i18n.translate('xpack.infra.groupByDisplayNames.serviceType', {
      defaultMessage: 'Service type',
    }),
  };
  return LOOKUP[field] || field;
};
