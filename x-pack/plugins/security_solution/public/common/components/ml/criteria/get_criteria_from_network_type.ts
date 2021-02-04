/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CriteriaFields } from '../types';
import { NetworkType } from '../../../../network/store/model';
import { FlowTarget } from '../../../../graphql/types';

export const getCriteriaFromNetworkType = (
  type: NetworkType,
  ip: string | undefined,
  flowTarget?: FlowTarget
): CriteriaFields[] => {
  if (type === NetworkType.details && ip != null) {
    if (flowTarget === FlowTarget.source) {
      return [{ fieldName: 'source.ip', fieldValue: ip }];
    } else if (flowTarget === FlowTarget.destination) {
      return [{ fieldName: 'destination.ip', fieldValue: ip }];
    } else {
      return [];
    }
  } else {
    return [];
  }
};
