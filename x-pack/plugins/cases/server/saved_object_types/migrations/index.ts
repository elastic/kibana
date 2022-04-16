/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectUnsanitizedDoc, SavedObjectSanitizedDoc } from '@kbn/core/server';
import { SECURITY_SOLUTION_OWNER } from '../../../common/constants';

export { caseMigrations } from './cases';
export { configureMigrations } from './configuration';
export { userActionsMigrations } from './user_actions';
export type { CreateCommentsMigrationsDeps } from './comments';
export { createCommentsMigrations } from './comments';

export interface SanitizedCaseOwner {
  owner: string;
}

export const addOwnerToSO = <T = Record<string, unknown>>(
  doc: SavedObjectUnsanitizedDoc<T>
): SavedObjectSanitizedDoc<SanitizedCaseOwner> => ({
  ...doc,
  attributes: {
    ...doc.attributes,
    owner: SECURITY_SOLUTION_OWNER,
  },
  references: doc.references || [],
});

export const connectorMappingsMigrations = {
  '7.14.0': (
    doc: SavedObjectUnsanitizedDoc<Record<string, unknown>>
  ): SavedObjectSanitizedDoc<SanitizedCaseOwner> => {
    return addOwnerToSO(doc);
  },
};
