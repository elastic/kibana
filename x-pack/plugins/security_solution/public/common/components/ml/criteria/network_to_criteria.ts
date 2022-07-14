/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FlowTargetSourceDest } from '../../../../../common/search_strategy';
import type { CriteriaFields } from '../types';

export const networkToCriteria = (
  ip: string,
  flowTarget: FlowTargetSourceDest
): CriteriaFields[] => {
  if (flowTarget === FlowTargetSourceDest.source) {
    return [{ fieldName: 'source.ip', fieldValue: ip }];
  } else if (flowTarget === FlowTargetSourceDest.destination) {
    return [{ fieldName: 'destination.ip', fieldValue: ip }];
  } else {
    return [];
  }
};
