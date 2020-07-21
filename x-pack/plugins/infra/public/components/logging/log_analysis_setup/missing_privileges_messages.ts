/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const missingMlSetupPrivilegesTitle = i18n.translate(
  'xpack.infra.logs.analysis.missingMlSetupPrivilegesTitle',
  {
    defaultMessage: 'Additional Machine Learning privileges required',
  }
);

export const missingMlSetupPrivilegesDescription = i18n.translate(
  'xpack.infra.logs.analysis.missingMlSetupPrivilegesDescription',
  {
    defaultMessage:
      'This feature makes use of Machine Learning jobs, which require all permissions for the Machine Learning App in order to be set up.',
  }
);
