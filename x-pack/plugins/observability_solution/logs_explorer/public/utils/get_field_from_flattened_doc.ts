/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogDocument } from '../../common/document';

type Field = keyof LogDocument['flattened'];

export const getFieldFromDoc = <T extends Field>(doc: LogDocument, field: T) => {
  const fieldValueArray = doc.flattened[field];
  return fieldValueArray && fieldValueArray.length ? fieldValueArray[0] : undefined;
};
