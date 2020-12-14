/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface Cloud {
  availability_zone?: string;
  instance?: {
    name: string;
    id: string;
  };
  machine?: {
    type: string;
  };
  project?: {
    id: string;
    name: string;
  };
  provider?: string;
  region?: string;
  account?: {
    id: string;
    name: string;
  };
  image?: {
    id: string;
  };
}
