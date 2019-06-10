/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createHashHistory } from 'history';

export const history = createHashHistory();

export const isImportRepositoryURLInvalid = (url: string) => url.trim() === '';

export const decodeRevisionString = (revision: string) => {
  return revision.replace(':', '/');
};

export const encodeRevisionString = (revision: string) => {
  return revision.replace('/', ':');
};
