/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { INDEX_ILLEGAL_CHARACTERS_VISIBLE } from 'ui/indices';

export const ILLEGAL_CHARACTERS = {
  ROLLUP_INDEX: [ ...INDEX_ILLEGAL_CHARACTERS_VISIBLE, '*' ]
};
