/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { take, toString, truncate, uniq } from 'lodash';

// When we write rule execution status updates to `siem-detection-engine-rule-status` saved objects
// or to event log, we write success and failure messages as well. Those messages are built from
// N errors collected during the "big loop" in the Detection Engine, where N can be very large.
// When N is large the resulting message strings are so large that these documents are up to 26MB.
// These large documents may cause migrations to fail because a batch of 1000 documents easily
// exceed Elasticsearch's `http.max_content_length` which defaults to 100mb.
// In order to fix that, we need to truncate those messages to an adequate MAX length.
// https://github.com/elastic/kibana/pull/112257

const MAX_MESSAGE_LENGTH = 10240;
const MAX_LIST_LENGTH = 20;

export const truncateMessage = (value: unknown): string | undefined => {
  if (value === undefined) {
    return value;
  }

  const str = toString(value);
  return truncate(str, { length: MAX_MESSAGE_LENGTH });
};

export const truncateMessageList = (list: string[]): string[] => {
  const deduplicatedList = uniq(list);
  return take(deduplicatedList, MAX_LIST_LENGTH);
};
