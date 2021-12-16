/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Fields } from '../../../../../common/search_strategy';

/**
 * If a prefix of our full field path is present as a field, we know that our field is nested
 */
export const getNestedParentPath = (
  fieldPath: string,
  fields: Fields | undefined
): string | undefined =>
  fields &&
  Object.keys(fields).find((field) => field !== fieldPath && fieldPath.startsWith(`${field}.`));
