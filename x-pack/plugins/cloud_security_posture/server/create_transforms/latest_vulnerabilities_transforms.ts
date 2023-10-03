/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import {
  CLOUD_SECURITY_POSTURE_PACKAGE_NAME,
  LATEST_VULNERABILITIES_INDEX_DEFAULT_NS,
  LATEST_VULNERABILITIES_RETENTION_POLICY,
  VULNERABILITIES_INDEX_PATTERN,
} from '../../common/constants';

export const latestVulnerabilitiesTransform: TransformPutTransformRequest = {
  transform_id: 'cloud_security_posture.vulnerabilities_latest-default-8.8.0',
  description:
    'Defines vulnerabilities transformation to view only the latest vulnerability per resource',
  source: {
    index: VULNERABILITIES_INDEX_PATTERN,
  },
  dest: {
    index: LATEST_VULNERABILITIES_INDEX_DEFAULT_NS,
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
      max_age: LATEST_VULNERABILITIES_RETENTION_POLICY,
    },
  },
  latest: {
    sort: '@timestamp',
    unique_key: ['vulnerability.id', 'resource.id', 'package.name', 'package.version'],
  },
  _meta: {
    package: {
      name: CLOUD_SECURITY_POSTURE_PACKAGE_NAME,
    },
    managed_by: 'cloud_security_posture',
    managed: true,
  },
};
