/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RelatedIntegrationArray } from '../../../../../common/detection_engine/rule_schema';

export const relatedIntegrations: RelatedIntegrationArray = [
  {
    package: 'system',
    version: '1.6.4',
  },
  {
    package: 'aws',
    integration: 'cloudtrail',
    version: '~1.11.0',
  },
];
