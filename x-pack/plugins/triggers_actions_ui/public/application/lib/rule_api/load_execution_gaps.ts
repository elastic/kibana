/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';
import { GapItem } from '../../sections/rule_details/components/rule_execution_gaps_list';

export const loadExecutionGaps = ({ id, http }: { id: string; http: HttpSetup }) => {
  return http.get<GapItem[]>(`${INTERNAL_BASE_ALERTING_API_PATH}/rule/${id}/_execution_gaps`, {});
};
