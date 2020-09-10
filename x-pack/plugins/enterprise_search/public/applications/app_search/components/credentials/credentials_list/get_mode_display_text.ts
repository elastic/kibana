/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ADMIN, SEARCH } from '../../../constants/credentials';
import { READ_WRITE, WRITE_ONLY, READ_ONLY } from './constants';
import { IApiToken } from '../../../../../../common/types/app_search';

export const getModeDisplayText = (apiToken: IApiToken): string => {
  const { read = false, write = false, type } = apiToken;

  switch (type) {
    case ADMIN:
      return '--';
    case SEARCH:
      return 'search';
    default:
      if (read && write) {
        return READ_WRITE;
      }
      return write ? WRITE_ONLY : READ_ONLY;
  }
};
