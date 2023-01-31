/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_UUID } from '@kbn/rule-data-utils';
import objectHash from 'object-hash';
import type { CompleteRule, RuleParams } from '../../rule_schema';
import { buildAlert } from '../factories/utils/build_alert';
import type { UnallowedFieldCheckResults } from './create_data_quality_alert_type';

interface BuildAlertsParams {
  spaceId: string;
  index: string[];
  completeRule: CompleteRule<RuleParams>;
}
export const buildAlerts = (
  { spaceId, completeRule, index }: BuildAlertsParams,
  issues: UnallowedFieldCheckResults
) =>
  issues.map(([faultyIndex, invalidFields]) => {
    const invalidFieldsSummary = invalidFields
      .map((f) => `invalid key in ${faultyIndex} "${f.key}" in ${f.doc_count} docs`)
      .join(', ');

    const id = objectHash([Date.now(), faultyIndex, invalidFields]);

    const baseAlert = buildAlert(
      [],
      completeRule,
      spaceId,
      `ecs integrity issues found: ${invalidFieldsSummary}`,
      index,
      undefined
    );

    return {
      _id: id,
      _index: '',
      _source: {
        ...baseAlert,
        [ALERT_UUID]: id,
      },
    };
  });
