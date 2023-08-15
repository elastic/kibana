/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rootRequest } from '../common';

export const createSpace = (id: string) => {
  rootRequest({
    method: 'POST',
    url: 'api/spaces/space',
    body: {
      id,
      name: id,
    },
    headers: { 'kbn-xsrf': 'cypress-creds' },
  });
};

export const removeSpace = (id: string) => {
  rootRequest({ url: `/api/spaces/space/${id}` });
};
