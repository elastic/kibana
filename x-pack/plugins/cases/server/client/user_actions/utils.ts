/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsFindResponse } from '@kbn/core-saved-objects-api-server';
import type {
  CaseUserActionResponse,
  CaseUserActionInjectedAttributesWithoutActionId,
  CaseUserActionsResponse,
  CaseUserActionsResponseWithoutActionId,
} from '../../../common/api';

export const extractAttributes = (
  userActions: SavedObjectsFindResponse<CaseUserActionResponse>
): CaseUserActionsResponse => {
  return userActions.saved_objects.map((so) => so.attributes);
};

export const formatSavedObjects = (
  response: SavedObjectsFindResponse<CaseUserActionInjectedAttributesWithoutActionId>
): CaseUserActionsResponseWithoutActionId =>
  response.saved_objects.map((so) => ({ id: so.id, version: so.version ?? '', ...so.attributes }));
