/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectUnsanitizedDoc, SavedObjectSanitizedDoc } from '@kbn/core/server';
import type { CreateCaseUserAction } from '../../../../common/api';
import { ActionTypes, CaseSeverity } from '../../../../common/api';

export const addSeverityToCreateUserAction = (
  doc: SavedObjectUnsanitizedDoc<CreateCaseUserAction>
): SavedObjectSanitizedDoc<CreateCaseUserAction> => {
  if (doc.attributes.type !== ActionTypes.create_case) {
    return { ...doc, references: doc.references ?? [] };
  }

  const payload = {
    ...doc.attributes.payload,
    severity: doc?.attributes?.payload?.severity ?? CaseSeverity.LOW,
  };
  return { ...doc, attributes: { ...doc.attributes, payload }, references: doc.references ?? [] };
};
