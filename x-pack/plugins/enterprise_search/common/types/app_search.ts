/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface Account {
  accountId: string;
  onboardingComplete: boolean;
  role: {
    id: string;
    roleType: string;
    ability: {
      accessAllEngines: boolean;
      manage: string[];
      edit: string[];
      view: string[];
      credentialTypes: string[];
      availableRoleTypes: string[];
    };
  };
}

export interface ConfiguredLimits {
  engine: {
    maxDocumentByteSize: number;
    maxEnginesPerMetaEngine: number;
  };
}
