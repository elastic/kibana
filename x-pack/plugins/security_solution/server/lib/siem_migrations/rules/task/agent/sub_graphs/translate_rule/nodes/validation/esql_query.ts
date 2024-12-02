/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EditorError } from '@kbn/esql-ast';
import { parse } from '@kbn/esql-ast';

export const parseEsqlQuery = (query: string): EditorError[] => {
  const { errors } = parse(query);
  return errors;
};
