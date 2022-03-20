/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from 'kibana/public';
import { BASE_TRIGGERS_ACTIONS_UI_API_PATH } from '../../../common';

export async function triggersActionsUiConfig({ http }: { http: HttpSetup }): Promise<any> {
  return await http.get(`${BASE_TRIGGERS_ACTIONS_UI_API_PATH}/_config`);
}
