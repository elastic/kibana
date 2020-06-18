/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flow } from 'lodash/fp';
import { replaceKqlCommasWithOr } from './replace_kql_commas_with_or';
import { removeKqlVariables } from './remove_kql_variables';

export const replaceKQLParts = (kqlQuery: string): string => {
  return flow(replaceKqlCommasWithOr, removeKqlVariables)(kqlQuery);
};
