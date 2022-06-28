/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpApiInterface } from '../common/api_routes';

export type FilesClient = {
  [method in keyof HttpApiInterface]: (
    args: HttpApiInterface[method]['inputs']['body'] &
      HttpApiInterface[method]['inputs']['params'] &
      HttpApiInterface[method]['inputs']['query']
  ) => Promise<HttpApiInterface[method]['output']>;
};
