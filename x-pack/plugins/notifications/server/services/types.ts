/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface EmailService {
  sendPlainTextEmail(payload: PlainTextEmail): Promise<void>;
  sendHTMLEmail(payload: HTMLEmail): Promise<void>;
}

export interface EmailServiceStart {
  isEmailServiceAvailable(): boolean;
  getEmailService(): EmailService;
}

export interface IEmailServiceProvider<T, U> {
  setup(setupDeps: T): void;
  start(startDeps: U): EmailServiceStart;
}

export interface RelatedSavedObject {
  id: string;
  type: string;
  namespace?: string; // namespace is undefined for the spaceId 'default'
}

export interface PlainTextEmail {
  to: string[];
  subject: string;
  message: string;
  context?: {
    relatedObjects?: RelatedSavedObject[];
  };
}

export interface HTMLEmail extends PlainTextEmail {
  messageHTML: string;
}
