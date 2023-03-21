/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectUnsanitizedDoc, SavedObjectSanitizedDoc } from '@kbn/core/server';
import type { CreateCaseUserAction } from '../../../../common/api';
import { ActionTypes } from '../../../../common/api';

export const addAssigneesToCreateUserAction = (
  doc: SavedObjectUnsanitizedDoc<CreateCaseUserAction>
): SavedObjectSanitizedDoc<CreateCaseUserAction> => {
  if (doc.attributes.type !== ActionTypes.create_case) {
    return { ...doc, references: doc.references ?? [] };
  }

  const payload = {
    ...doc.attributes.payload,
    assignees: doc?.attributes?.payload?.assignees ?? [],
  };
  return { ...doc, attributes: { ...doc.attributes, payload }, references: doc.references ?? [] };
};
