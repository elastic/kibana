/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FrameworkUser } from '../framework/adapter_types';

export interface TokenEnrollmentData {
  token: string | null;
  expires_on: string;
}

export interface CMTokensAdapter {
  deleteEnrollmentToken(user: FrameworkUser, enrollmentToken: string): Promise<void>;
  getEnrollmentToken(user: FrameworkUser, enrollmentToken: string): Promise<TokenEnrollmentData>;
  insertTokens(user: FrameworkUser, tokens: TokenEnrollmentData[]): Promise<TokenEnrollmentData[]>;
}
