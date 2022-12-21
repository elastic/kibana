/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isESClientError } from '../../errors';

export const isElasticsearchItemNotFoundError = (error: Error): boolean => {
  return (
    isESClientError(error) &&
    error.meta.statusCode === 404 &&
    (error.meta.body as any).found === false
  );
};
