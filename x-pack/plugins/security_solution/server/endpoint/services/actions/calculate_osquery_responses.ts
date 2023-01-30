/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { every, isEmpty, some } from 'lodash';
import type { OsqueryActivityLogActionResponse } from '../../../../common/endpoint/types';

export const calculateOsqueryResponses = (responses: OsqueryActivityLogActionResponse[]) => {
  const completedAt = responses[0]?.item.data['@timestamp'];
  const allSuccessful = every(responses, ({ item }) => {
    return isEmpty(item.data.EndpointActions.error);
  });
  if (allSuccessful) {
    return {
      wasSuccessful: true,
      completedAt,
      partiallySuccessful: false,
    };
  } else {
    const partiallySuccessful = some(responses, ({ item }) => {
      return isEmpty(item.data.EndpointActions.error);
    });

    if (partiallySuccessful) {
      return {
        wasSuccessful: true,
        completedAt,
        partiallySuccessful: true,
      };
    }
    return {
      wasSuccessful: false,
      completedAt,
      partiallySuccessful: false,
    };
  }
};
