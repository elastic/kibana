/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface CrawlerDomainValidationResultFromServer {
  results: Array<{
    comment: string;
    name: string;
    result: 'ok' | 'warning' | 'failure';
  }>;
  valid: boolean;
}

export type CrawlerDomainValidationStepState = '' | 'loading' | 'valid' | 'warning' | 'invalid';

export interface CrawlerDomainValidationStep {
  blockingFailure?: boolean;
  message?: string;
  state: CrawlerDomainValidationStepState;
}

interface CrawlerDomainValidationState {
  contentVerification: CrawlerDomainValidationStep;
  indexingRestrictions: CrawlerDomainValidationStep;
  initialValidation: CrawlerDomainValidationStep;
  networkConnectivity: CrawlerDomainValidationStep;
}

export interface CrawlerDomainValidationResult {
  steps: CrawlerDomainValidationState;
}

export type CrawlerDomainValidationResultChange = Partial<CrawlerDomainValidationState>;

export type CrawlerDomainValidationStepName =
  | 'initialValidation'
  | 'networkConnectivity'
  | 'indexingRestrictions'
  | 'contentVerification';
