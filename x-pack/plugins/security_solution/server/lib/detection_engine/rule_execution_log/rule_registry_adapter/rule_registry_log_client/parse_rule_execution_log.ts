/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isLeft } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { technicalRuleFieldMap } from '../../../../../../../rule_registry/common/assets/field_maps/technical_rule_field_map';
import { pickWithPatterns } from '../../../../../../../rule_registry/common/pick_with_patterns';
import * as Fields from '../../../../../../../rule_registry/common/technical_rule_data_field_names';
import {
  mergeFieldMaps,
  runtimeTypeFromFieldMap,
} from '../../../../../../../rule_registry/common/field_map';
import { ruleExecutionFieldMap } from './rule_execution_field_map';

const ruleExecutionLogRuntimeType = runtimeTypeFromFieldMap(
  mergeFieldMaps(
    ruleExecutionFieldMap,
    pickWithPatterns(
      technicalRuleFieldMap,
      Fields.ALERT_RULE_CONSUMER,
      Fields.ALERT_RULE_TYPE_ID,
      Fields.ALERT_RULE_UUID,
      Fields.EVENT_ACTION,
      Fields.EVENT_KIND,
      Fields.SPACE_IDS,
      Fields.TIMESTAMP
    )
  )
);

/**
 * @deprecated parseRuleExecutionLog is kept here only as a reference. It will be superseded with EventLog implementation
 */
export const parseRuleExecutionLog = (input: unknown) => {
  const validate = ruleExecutionLogRuntimeType.decode(input);

  if (isLeft(validate)) {
    throw new Error(PathReporter.report(validate).join('\n'));
  }

  return ruleExecutionLogRuntimeType.encode(validate.right);
};

/**
 * @deprecated RuleExecutionEvent is kept here only as a reference. It will be superseded with EventLog implementation
 *
 * It's marked as `Partial` because the field map is not yet appropriate for
 * execution log events.
 */
export type RuleExecutionEvent = Partial<ReturnType<typeof parseRuleExecutionLog>>;
