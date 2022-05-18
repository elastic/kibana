/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UsersType } from '../../../../users/store/model';
import { CriteriaFields } from '../types';

export const getCriteriaFromUsersType = (
  type: UsersType,
  userName: string | undefined
): CriteriaFields[] => {
  if (type === UsersType.details && userName != null) {
    return [{ fieldName: 'user.name', fieldValue: userName }];
  } else {
    return [];
  }
};
