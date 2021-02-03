/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CaseStatuses } from '../../../../../case/common/api';
import { Case } from '../../containers/types';
import { statuses } from '../status';

export const getStatusDate = (theCase: Case): string | null => {
  if (theCase.status === CaseStatuses.open) {
    return theCase.createdAt;
  } else if (theCase.status === CaseStatuses['in-progress']) {
    return theCase.updatedAt;
  } else if (theCase.status === CaseStatuses.closed) {
    return theCase.closedAt;
  }

  return null;
};

export const getStatusTitle = (status: CaseStatuses) => statuses[status].actionBar.title;
