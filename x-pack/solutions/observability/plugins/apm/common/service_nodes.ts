/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SERVICE_NODE_NAME_MISSING = '_service_node_name_missing_';

const UNIDENTIFIED_SERVICE_NODES_LABEL = i18n.translate('xpack.apm.serviceNodeNameMissing', {
  defaultMessage: '(Empty)',
});

export function getServiceNodeName(serviceNodeName?: string) {
  return serviceNodeName === SERVICE_NODE_NAME_MISSING || !serviceNodeName
    ? UNIDENTIFIED_SERVICE_NODES_LABEL
    : serviceNodeName;
}
