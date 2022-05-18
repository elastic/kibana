/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from '@kbn/core/public';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';

export async function updateAPIKey({ id, http }: { id: string; http: HttpSetup }): Promise<string> {
  return http.post<string>(
    `${INTERNAL_BASE_ALERTING_API_PATH}/rule/${encodeURIComponent(id)}/_update_api_key`
  );
}
