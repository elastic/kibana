/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { omit } from 'lodash';
import { KBN_SCREENSHOT_HEADER_BLACKLIST } from '../../../common/constants';
import { JobDocPayload, KbnServer } from '../../../types';

export const omitBlacklistedHeaders = ({
  job,
  decryptedHeaders,
  server,
}: {
  job: JobDocPayload;
  decryptedHeaders: Record<string, string>;
  server: KbnServer;
}) => {
  const filteredHeaders: Record<string, string> = omit(
    decryptedHeaders,
    KBN_SCREENSHOT_HEADER_BLACKLIST
  );
  return { job, filteredHeaders, server };
};
