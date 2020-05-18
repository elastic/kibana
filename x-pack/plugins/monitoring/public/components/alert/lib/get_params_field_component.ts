/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from '../../../legacy_shims';

export function getParamsFieldsComponent(actionTypeId: string) {
  if (!actionTypeId) {
    return null;
  }
  const actionTypeRegistered = Legacy.shims.triggersActionsUi.actionTypeRegistry.get(actionTypeId);
  return actionTypeRegistered ? actionTypeRegistered.actionParamsFields : null;
}
