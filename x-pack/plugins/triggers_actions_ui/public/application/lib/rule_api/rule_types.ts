/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from 'kibana/public';
import { RuleType } from '../../../types';
import { BASE_ALERTING_API_PATH } from '../../constants';
import { AsApiContract, RewriteRequestCase } from '../../../../../actions/common';

const rewriteResponseRes = (results: Array<AsApiContract<RuleType>>): RuleType[] => {
  return results.map((item) => rewriteBodyReq(item));
};

const rewriteBodyReq: RewriteRequestCase<RuleType> = ({
  enabled_in_license: enabledInLicense,
  recovery_action_group: recoveryActionGroup,
  action_groups: actionGroups,
  default_action_group_id: defaultActionGroupId,
  minimum_license_required: minimumLicenseRequired,
  action_variables: actionVariables,
  authorized_consumers: authorizedConsumers,
  rule_task_timeout: ruleTaskTimeout,
  does_set_recovery_context: doesSetRecoveryContext,
  default_schedule_interval: defaultScheduleInterval,
  ...rest
}: AsApiContract<RuleType>) => ({
  enabledInLicense,
  recoveryActionGroup,
  actionGroups,
  defaultActionGroupId,
  minimumLicenseRequired,
  actionVariables,
  authorizedConsumers,
  ruleTaskTimeout,
  doesSetRecoveryContext,
  defaultScheduleInterval,
  ...rest,
});

export async function loadRuleTypes({ http }: { http: HttpSetup }): Promise<RuleType[]> {
  const res = await http.get<Array<AsApiContract<RuleType<string, string>>>>(
    `${BASE_ALERTING_API_PATH}/rule_types`
  );
  return rewriteResponseRes(res);
}
