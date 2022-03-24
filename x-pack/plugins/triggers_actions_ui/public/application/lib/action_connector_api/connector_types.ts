/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from 'kibana/public';

import { AsApiContract, RewriteRequestCase } from '../../../../../actions/common';
import { BASE_ACTION_API_PATH } from '../../constants';
import type { ActionType } from '../../../types';

const rewriteResponseRes = (results: Array<AsApiContract<ActionType>>): ActionType[] => {
  return results.map((item) => rewriteBodyReq(item));
};

const rewriteBodyReq: RewriteRequestCase<ActionType> = ({
  enabled_in_config: enabledInConfig,
  enabled_in_license: enabledInLicense,
  minimum_license_required: minimumLicenseRequired,
  ...res
}: AsApiContract<ActionType>) => ({
  enabledInConfig,
  enabledInLicense,
  minimumLicenseRequired,
  ...res,
});

export async function loadActionTypes({ http }: { http: HttpSetup }): Promise<ActionType[]> {
  const res = await http.get<Parameters<typeof rewriteResponseRes>[0]>(
    `${BASE_ACTION_API_PATH}/connector_types`
  );
  return rewriteResponseRes(res);
}
