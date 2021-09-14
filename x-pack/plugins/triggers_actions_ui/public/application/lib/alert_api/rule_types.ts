/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from 'kibana/public';
import { AlertType } from '../../../types';
import { BASE_ALERTING_API_PATH } from '../../constants';
import { AsApiContract, RewriteRequestCase } from '../../../../../actions/common';

const rewriteResponseRes = (results: Array<AsApiContract<AlertType>>): AlertType[] => {
  return results.map((item) => rewriteBodyReq(item));
};

const rewriteBodyReq: RewriteRequestCase<AlertType> = ({
  enabled_in_license: enabledInLicense,
  recovery_action_group: recoveryActionGroup,
  action_groups: actionGroups,
  default_action_group_id: defaultActionGroupId,
  minimum_license_required: minimumLicenseRequired,
  action_variables: actionVariables,
  authorized_consumers: authorizedConsumers,
  ...rest
}: AsApiContract<AlertType>) => ({
  enabledInLicense,
  recoveryActionGroup,
  actionGroups,
  defaultActionGroupId,
  minimumLicenseRequired,
  actionVariables,
  authorizedConsumers,
  ...rest,
});

export async function loadAlertTypes({ http }: { http: HttpSetup }): Promise<AlertType[]> {
  const res = await http.get(`${BASE_ALERTING_API_PATH}/rule_types`);
  return rewriteResponseRes(res);
}
