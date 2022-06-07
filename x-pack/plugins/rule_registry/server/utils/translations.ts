/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const WRITING_DISABLED_ERROR_MSG = i18n.translate(
  'xpack.ruleRegistry.write.disabledErrorMsg',
  {
    defaultMessage:
      'Rule registry writing is disabled. Make sure that "xpack.ruleRegistry.write.enabled" configuration is not set to false within "kibana.yml" and that Rule Data Client was initialized successfully.',
  }
);
