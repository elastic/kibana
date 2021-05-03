/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ADD, UPDATE } from './constants/operations';

export type TOperation = typeof ADD | typeof UPDATE;

export interface RoleRules {
  username?: string;
  role?: string;
  email?: string;
  metadata?: string;
}

export interface AttributeExamples {
  username: string;
  email: string;
  metadata: string;
}

export type AttributeName = keyof AttributeExamples | 'role';

export interface RoleMapping {
  id: string;
  attributeName: AttributeName;
  attributeValue: string;
  authProvider: string[];
  roleType: string;
  rules: RoleRules;
}
