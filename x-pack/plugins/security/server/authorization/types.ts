/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface HasPrivilegesResponseApplication {
  [resource: string]: {
    [privilegeName: string]: boolean;
  };
}

export interface HasPrivilegesResponse {
  has_all_requested: boolean;
  username: string;
  application: {
    [applicationName: string]: HasPrivilegesResponseApplication;
  };
  cluster?: {
    [privilegeName: string]: boolean;
  };
  index?: {
    [indexName: string]: {
      [privilegeName: string]: boolean;
    };
  };
}

export interface CheckPrivilegesPayload {
  kibana?: string | string[];
  elasticsearch?: {
    cluster: string[];
    index: Record<string, string[]>;
  };
}
