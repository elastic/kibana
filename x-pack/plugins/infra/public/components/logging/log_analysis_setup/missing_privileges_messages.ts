/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const missingMlPrivilegesTitle = i18n.translate(
  'xpack.infra.logs.analysis.missingMlPrivilegesTitle',
  {
    defaultMessage: 'Additional Machine Learning privileges required',
  }
);

export const missingMlResultsPrivilegesDescription = i18n.translate(
  'xpack.infra.logs.analysis.missingMlResultsPrivilegesDescription',
  {
    defaultMessage:
      'This feature makes use of Machine Learning jobs, which require at least the read permission for the Machine Learning app in order to access their status and results.',
  }
);

export const missingMlSetupPrivilegesDescription = i18n.translate(
  'xpack.infra.logs.analysis.missingMlSetupPrivilegesDescription',
  {
    defaultMessage:
      'This feature makes use of Machine Learning jobs, which require all permissions for the Machine Learning app in order to be set up.',
  }
);
