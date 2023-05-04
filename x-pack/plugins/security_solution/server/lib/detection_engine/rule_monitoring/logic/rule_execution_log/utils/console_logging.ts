/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LogMeta } from '@kbn/core/server';
import type { RuleExecutionStatus } from '../../../../../../../common/detection_engine/rule_monitoring';

/**
 * Extended metadata that rule execution logger can attach to every console log record.
 */
export interface ExtMeta extends LogMeta {
  rule: ExtRule;
  kibana?: ExtKibana;
}

interface ExtRule extends NonNullable<LogMeta['rule']> {
  id: string;
  type?: string;
  execution?: {
    uuid: string;
    status?: RuleExecutionStatus;
  };
}

interface ExtKibana {
  spaceId?: string;
}
