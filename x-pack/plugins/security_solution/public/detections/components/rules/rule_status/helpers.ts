/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleExecutionStatus } from '../../../../../common/detection_engine/schemas/common/schemas';

export const getStatusColor = (status: RuleExecutionStatus | string | null) =>
  status == null
    ? 'subdued'
    : status === 'succeeded'
    ? 'success'
    : status === 'failed'
    ? 'danger'
    : status === 'executing' ||
      status === 'going to run' ||
      status === 'partial failure' ||
      status === 'warning'
    ? 'warning'
    : 'subdued';
