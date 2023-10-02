/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type ChatVariant = 'header' | 'bubble';

export interface GetChatUserDataResponseBody {
  token: string;
  email: string;
  id: string;
  chatVariant: ChatVariant;
}
