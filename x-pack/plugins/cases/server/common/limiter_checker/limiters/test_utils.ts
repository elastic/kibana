/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CommentType } from '../../../../common/api';
import type { CommentRequestUserType } from '../../../../common/api';

export const createUserRequests = (num: number): CommentRequestUserType[] => {
  const requests = [...Array(num).keys()].map((value) => {
    return {
      comment: `${value}`,
      type: CommentType.user as const,
      owner: 'test',
    };
  });

  return requests;
};
