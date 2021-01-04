/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BackgroundSessionStatus } from '../../../common';
import { SearchStatusInfo } from './get_search_status';
import { SearchStatus } from './types';

export function getSessionStatus(searchStatuses: SearchStatusInfo[]): BackgroundSessionStatus {
  if (searchStatuses.some((item) => item.status === SearchStatus.ERROR)) {
    return BackgroundSessionStatus.ERROR;
  } else if (
    searchStatuses.length > 0 &&
    searchStatuses.every((item) => item.status === SearchStatus.COMPLETE)
  ) {
    return BackgroundSessionStatus.COMPLETE;
  } else {
    return BackgroundSessionStatus.IN_PROGRESS;
  }
}
