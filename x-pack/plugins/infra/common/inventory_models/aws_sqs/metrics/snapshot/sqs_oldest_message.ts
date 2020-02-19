/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SnapshotModel } from '../../../types';

export const sqsOldestMessage: SnapshotModel = {
  sqsOldestMessage: {
    max: {
      field: 'aws.sqs.oldest_message_age.sec',
    },
  },
};
