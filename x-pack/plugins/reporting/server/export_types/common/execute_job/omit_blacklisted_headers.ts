/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { omitBy } from 'lodash';
import {
  KBN_SCREENSHOT_HEADER_BLACKLIST,
  KBN_SCREENSHOT_HEADER_BLACKLIST_STARTS_WITH_PATTERN,
} from '../../../../common/constants';

export const omitBlacklistedHeaders = <ScheduledTaskParamsType>({
  job,
  decryptedHeaders,
}: {
  job: ScheduledTaskParamsType;
  decryptedHeaders: Record<string, string>;
}) => {
  const filteredHeaders: Record<string, string> = omitBy(
    decryptedHeaders,
    (_value, header: string) =>
      header &&
      (KBN_SCREENSHOT_HEADER_BLACKLIST.includes(header) ||
        KBN_SCREENSHOT_HEADER_BLACKLIST_STARTS_WITH_PATTERN.some((pattern) =>
          header?.startsWith(pattern)
        ))
  );
  return filteredHeaders;
};
