/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogMeta } from 'src/core/server';
import { RuleExecutionStatus } from '../../../../../common/detection_engine/schemas/common';

/**
 * Custom extended log metadata that rule execution logger can attach to every log record.
 */
export type ExtMeta = LogMeta & {
  rule?: LogMeta['rule'] & {
    type?: string;
    execution?: {
      status?: RuleExecutionStatus;
    };
  };
  kibana?: {
    spaceId?: string;
  };
};
