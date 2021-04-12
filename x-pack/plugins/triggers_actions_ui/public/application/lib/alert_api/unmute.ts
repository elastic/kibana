/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from 'kibana/public';
import { BASE_ALERTING_API_PATH } from '../../constants';

export async function unmuteAlert({ id, http }: { id: string; http: HttpSetup }): Promise<void> {
  await http.post(`${BASE_ALERTING_API_PATH}/rule/${id}/_unmute_all`);
}

export async function unmuteAlerts({
  ids,
  http,
}: {
  ids: string[];
  http: HttpSetup;
}): Promise<void> {
  await Promise.all(ids.map((id) => unmuteAlert({ id, http })));
}
