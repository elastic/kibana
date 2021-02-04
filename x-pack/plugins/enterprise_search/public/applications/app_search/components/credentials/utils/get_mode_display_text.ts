/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApiTokenTypes, READ_ONLY, READ_WRITE, SEARCH_DISPLAY, WRITE_ONLY } from '../constants';
import { ApiToken } from '../types';

export const getModeDisplayText = (apiToken: ApiToken): string => {
  const { read = false, write = false, type } = apiToken;

  switch (type) {
    case ApiTokenTypes.Admin:
      return '--';
    case ApiTokenTypes.Search:
      return SEARCH_DISPLAY;
    default:
      if (read && write) {
        return READ_WRITE;
      }
      return write ? WRITE_ONLY : READ_ONLY;
  }
};
