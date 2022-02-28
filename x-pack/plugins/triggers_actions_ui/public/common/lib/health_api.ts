/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from 'kibana/public';

const TRIGGERS_ACTIONS_UI_API_ROOT = '/api/triggers_actions_ui';

interface TriggersActionsUiHealth {
  isRulesAvailable: boolean;
}

interface TriggersActionsServerHealth {
  isAlertsAvailable: boolean;
}

export async function triggersActionsUiHealth({
  http,
}: {
  http: HttpSetup;
}): Promise<TriggersActionsUiHealth> {
  const result = await http.get<TriggersActionsServerHealth>(
    `${TRIGGERS_ACTIONS_UI_API_ROOT}/_health`
  );
  if (result) {
    return {
      isRulesAvailable: result.isAlertsAvailable,
    };
  }
  return result;
}
