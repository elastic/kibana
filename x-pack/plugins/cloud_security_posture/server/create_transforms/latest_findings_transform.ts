/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import {
  CLOUD_SECURITY_POSTURE_PACKAGE_NAME,
  FINDINGS_INDEX_PATTERN,
  LATEST_FINDINGS_INDEX_DEFAULT_NS,
  LATEST_FINDINGS_RETENTION_POLICY,
} from '../../common/constants';

export const latestFindingsTransform: TransformPutTransformRequest = {
  transform_id: 'cloud_security_posture.findings_latest-default-8.8.0',
  description: 'Defines findings transformation to view only the latest finding per resource',
  source: {
    index: FINDINGS_INDEX_PATTERN,
  },
  dest: {
    index: LATEST_FINDINGS_INDEX_DEFAULT_NS,
  },
  frequency: '5m',
  sync: {
    time: {
      field: 'event.ingested',
      delay: '60s',
    },
  },
  retention_policy: {
    time: {
      field: '@timestamp',
      max_age: LATEST_FINDINGS_RETENTION_POLICY,
    },
  },
  latest: {
    sort: '@timestamp',
    unique_key: ['resource.id', 'rule.id'],
  },
  settings: { unattended: true },
  _meta: {
    package: {
      name: CLOUD_SECURITY_POSTURE_PACKAGE_NAME,
    },
    managed_by: 'cloud_security_posture',
    managed: true,
  },
};
