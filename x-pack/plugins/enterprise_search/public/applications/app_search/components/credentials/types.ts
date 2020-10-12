/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IEngine } from '../../types';
import { ApiTokenTypes } from './constants';

export interface ICredentialsDetails {
  engines: IEngine[];
}

export interface IApiToken {
  access_all_engines?: boolean;
  key?: string;
  engines?: string[];
  id?: number;
  name: string;
  read?: boolean;
  type: ApiTokenTypes;
  write?: boolean;
}

export interface ITokenReadWrite {
  name: 'read' | 'write';
  checked: boolean;
}
