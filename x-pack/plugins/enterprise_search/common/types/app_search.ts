/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface IAccount {
  accountId: string;
  onBoardingComplete: boolean;
  role: IRole;
}

export interface IRole {
  id: string;
  roleType: string;
  ability: {
    accessAllEngines: boolean;
    destroy: string[];
    manage: string[];
    edit: string[];
    view: string[];
    credentialTypes: string[];
    availableRoleTypes: string[];
  };
}

export interface IConfiguredLimits {
  engine: {
    maxDocumentByteSize: number;
    maxEnginesPerMetaEngine: number;
  };
}

export interface IApiToken {
  access_all_engines?: boolean;
  key?: string;
  engines?: string[];
  id?: number;
  name: string;
  read?: boolean;
  type: string;
  write?: boolean;
}

export interface IMetaPage {
  current: number;
  size: number;
  total_pages: number;
  total_results: number;
}

export interface IMeta {
  page: IMetaPage;
}

export interface IEngine {
  name: string;
  type: string;
  language: string;
  result_fields: object[];
}

export interface ICredentialsDetails {
  lmAccount: {
    id: string;
    key: string;
  };
  apiUrl: string;
  apiTokens: IApiToken[];
  engines: IEngine[];
}
