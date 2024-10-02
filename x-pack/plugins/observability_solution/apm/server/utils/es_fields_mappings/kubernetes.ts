/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  KUBERNETES_NAMESPACE,
  KUBERNETES_POD_NAME,
  KUBERNETES_POD_UID,
  type Kubernetes,
} from '@kbn/apm-types';
import {
  cleanUndefinedFields,
  isOptionalFieldDefined,
  normalizeValue,
} from './es_fields_mappings_helpers';
import type { Fields } from './types';
import {
  KUBERNETES_REPLICASET_NAME,
  KUBERNETES_DEPLOYMENT_NAME,
  KUBERNETES_CONTAINER_ID,
  KUBERNETES_CONTAINER_NAME,
} from '../../../common/es_fields/infra_metrics';

export const kubernetesMapping = (
  fields: Fields
): { kubernetes?: Kubernetes | undefined } | undefined => ({
  ...(isOptionalFieldDefined(fields, 'kubernetes.')
    ? {
        kubernetes: {
          pod: cleanUndefinedFields({
            name: normalizeValue<string>(fields[KUBERNETES_POD_NAME]),
            uid: normalizeValue<string>(fields[KUBERNETES_POD_UID]),
          }),
          namespace: normalizeValue<string>(fields[KUBERNETES_NAMESPACE]),
          replicaset: cleanUndefinedFields({
            name: normalizeValue<string>(fields[KUBERNETES_REPLICASET_NAME]),
          }),
          deployment: cleanUndefinedFields({
            name: normalizeValue<string>(fields[KUBERNETES_DEPLOYMENT_NAME]),
          }),
          container: cleanUndefinedFields({
            id: normalizeValue<string>(fields[KUBERNETES_CONTAINER_ID]),
            name: normalizeValue<string>(fields[KUBERNETES_CONTAINER_NAME]),
          }),
        },
      }
    : undefined),
});
