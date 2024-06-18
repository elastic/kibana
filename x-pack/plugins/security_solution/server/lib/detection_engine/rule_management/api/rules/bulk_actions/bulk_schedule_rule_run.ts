/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { ScheduleBackfillParams } from '@kbn/alerting-plugin/server/application/backfill/methods/schedule/types';
import type { BulkScheduleBackfill } from '../../../../../../../common/api/detection_engine';
import type { ExperimentalFeatures } from '../../../../../../../common';
import type { PromisePoolError } from '../../../../../../utils/promise_pool';
import type { MlAuthz } from '../../../../../machine_learning/authz';
import type { RuleAlertType } from '../../../../rule_schema';
import { validateBulkScheduleBackfill } from '../../../logic/bulk_actions/validations';

interface BulkScheduleBackfillArgs {
  rules: RuleAlertType[];
  isDryRun?: boolean;
  rulesClient: RulesClient;
  mlAuthz: MlAuthz;
  backfillPayload: BulkScheduleBackfill['backfill'];
  experimentalFeatures: ExperimentalFeatures;
}

interface BulkScheduleBackfillOutcome {
  backfilled: RuleAlertType[];
  errors: Array<PromisePoolError<RuleAlertType, Error>>;
}

export const bulkScheduleBackfill = async ({
  rules,
  isDryRun,
  rulesClient,
  mlAuthz,
  backfillPayload,
  experimentalFeatures,
}: BulkScheduleBackfillArgs): Promise<BulkScheduleBackfillOutcome> => {
  const errors: Array<PromisePoolError<RuleAlertType, Error>> = [];

  // In the first step, we validate if it is possible to schedule backfill for the rules
  const validatedRules: RuleAlertType[] = [];
  await Promise.all(
    rules.map(async (rule) => {
      try {
        await validateBulkScheduleBackfill({
          mlAuthz,
          rule,
          backfillPayload,
          experimentalFeatures,
        });
        validatedRules.push(rule);
      } catch (error) {
        errors.push({ item: rule, error });
      }
    })
  );

  if (isDryRun || validatedRules.length === 0) {
    return {
      backfilled: validatedRules,
      errors,
    };
  }

  // Then if it's not a dry run, we schedule backfill for the rules that passed the validation
  const params: ScheduleBackfillParams = validatedRules.map(({ id }) => ({
    ruleId: id,
    start: backfillPayload.start_date,
    end: backfillPayload.end_date,
  }));

  // Perform actual schedule using the rulesClient
  await rulesClient.scheduleBackfill(params);

  return {
    backfilled: validatedRules,
    errors,
  };
};
