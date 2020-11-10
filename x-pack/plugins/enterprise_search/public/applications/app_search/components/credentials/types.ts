/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Engine } from '../../types';
import { ApiTokenTypes } from './constants';

export interface CredentialsDetails {
  engines: Engine[];
}

export interface ApiToken {
  access_all_engines?: boolean;
  key?: string;
  engines?: string[];
  id?: number;
  name: string;
  read?: boolean;
  type: ApiTokenTypes;
  write?: boolean;
}

export interface TokenReadWrite {
  name: 'read' | 'write';
  checked: boolean;
}
