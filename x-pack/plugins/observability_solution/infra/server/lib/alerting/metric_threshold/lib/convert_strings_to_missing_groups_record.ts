/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isString } from 'lodash';
import { MissingGroupsRecord } from './check_missing_group';

export const convertStringsToMissingGroupsRecord = (
  missingGroups: Array<string | MissingGroupsRecord>
) => {
  return missingGroups.map((subject) => {
    if (isString(subject)) {
      const parts = subject.split(',');
      return {
        key: subject,
        bucketKey: parts.reduce((acc, part, index) => {
          acc[`groupBy${index}`] = part;
          return acc;
        }, {} as Record<string, string>),
      };
    }
    return subject;
  });
};
