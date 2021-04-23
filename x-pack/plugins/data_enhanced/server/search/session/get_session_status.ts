/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import {
  SearchSessionSavedObjectAttributes,
  SearchSessionStatus,
} from '../../../../../../src/plugins/data/common/';
import { SearchStatus } from './types';

function isSessionExpired(session: SearchSessionSavedObjectAttributes): boolean {
  const curTime = moment();
  return curTime.diff(moment(session.expires), 'ms') > 0;
}

export function getSessionStatus(session: SearchSessionSavedObjectAttributes): SearchSessionStatus {
  const searchStatuses = Object.values(session.idMapping);
  if (searchStatuses.some((item) => item.status === SearchStatus.ERROR)) {
    return SearchSessionStatus.ERROR;
  } else if (isSessionExpired(session)) {
    return SearchSessionStatus.EXPIRED;
  } else if (
    searchStatuses.length > 0 &&
    searchStatuses.every((item) => item.status === SearchStatus.COMPLETE)
  ) {
    return SearchSessionStatus.COMPLETE;
  } else {
    return SearchSessionStatus.IN_PROGRESS;
  }
}
