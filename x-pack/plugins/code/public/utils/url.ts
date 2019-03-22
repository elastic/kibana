/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createHistory from 'history/createHashHistory';

export const history = createHistory();

export const isImportRepositoryURLInvalid = (url: string) => url.trim() === '';
