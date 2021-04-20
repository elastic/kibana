/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '../../../../../../src/core/server';

import { getJSON } from './get_json';

export const logMappingError = ({
  logger,
  id,
  message,
  error,
  postBody,
}: {
  logger: Logger;
  id: string;
  error: unknown;
  message: string;
  postBody: {} | undefined;
}): void => {
  const postString = postBody != null ? `, post body: "${getJSON(postBody)}"` : '';
  logger.error(`${message}, mapping id: "${id}"${postString}, error: ${getJSON(error)}`);
};
