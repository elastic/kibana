/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from 'kibana/public';
import { AsApiContract } from '../../../../../actions/common';
import { ResolvedRule } from '../../../types';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';
import { transformResolvedRule } from './common_transformations';

export async function resolveRule({
  http,
  ruleId,
}: {
  http: HttpSetup;
  ruleId: string;
}): Promise<ResolvedRule> {
  const res = await http.get<AsApiContract<ResolvedRule>>(
    `${INTERNAL_BASE_ALERTING_API_PATH}/rule/${encodeURIComponent(ruleId)}/_resolve`
  );
  return transformResolvedRule(res);
}
