/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pick, values } from 'lodash';

/**
 * @param object to be used to generate the search value
 * @param array of property keys to use to generate the search value
 * @return newline delimited string built from the specified properties
 */
export function getSearchValue(obj: {}, fields: any[]) {
  return values(pick(obj, fields)).join('\n');
}
