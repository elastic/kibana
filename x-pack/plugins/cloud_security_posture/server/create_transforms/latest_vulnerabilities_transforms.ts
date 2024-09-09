/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import {
  CLOUD_SECURITY_POSTURE_PACKAGE_NAME,
  CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN,
  LATEST_VULNERABILITIES_RETENTION_POLICY,
  VULNERABILITIES_INDEX_PATTERN,
} from '../../common/constants';

const CURRENT_VULN_TRANSFORM_VERSION =
  'cloud_security_posture.vulnerabilities_latest-default-8.15.0';

export const DEPRECATED_VULN_TRANSFORM_VERSIONS = [
  'cloud_security_posture.vulnerabilities_latest-default-8.8.0',
];

export const latestVulnerabilitiesTransform: TransformPutTransformRequest = {
  transform_id: CURRENT_VULN_TRANSFORM_VERSION,
  description:
    'Defines vulnerabilities transformation to view only the latest vulnerability per resource',
  source: {
    index: VULNERABILITIES_INDEX_PATTERN,
  },
  dest: {
    index: CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN,
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
  settings: { unattended: true },
  _meta: {
    package: {
      name: CLOUD_SECURITY_POSTURE_PACKAGE_NAME,
    },
    managed_by: 'cloud_security_posture',
    managed: true,
  },
};
