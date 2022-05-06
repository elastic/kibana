/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable max-classes-per-file */

import { schema, TypeOf } from '@kbn/config-schema';
import { AxiosError } from 'axios';
import { BasicConnector } from './basic';
import { CaseConnector } from './case';
import { ExternalServiceIncidentResponse, ServiceParams } from './types';

export const TestConfigSchema = schema.object({ url: schema.string() });
export const TestSecretsSchema = schema.object({
  username: schema.string(),
  password: schema.string(),
});
export type TestConfig = TypeOf<typeof TestConfigSchema>;
export type TestSecrets = TypeOf<typeof TestSecretsSchema>;

interface ErrorSchema {
  errorMessage: string;
  errorCode: number;
}

export class TestBasicConnector extends BasicConnector<TestConfig, TestSecrets> {
  constructor(params: ServiceParams<TestConfig, TestSecrets>) {
    super(params);
    this.registerSubAction({
      name: 'testUrl',
      method: 'testUrl',
      schema: schema.object({ url: schema.string() }),
    });
  }

  protected getResponseErrorMessage(error: AxiosError<ErrorSchema>) {
    return `Message: ${error.response?.data.errorMessage}. Code: ${error.response?.data.errorCode}`;
  }

  public async testUrl({ url, data = {} }: { url: string; data?: Record<string, unknown> | null }) {
    const res = await this.request({
      url,
      data,
      headers: { 'X-Test-Header': 'test' },
      responseSchema: schema.object({ status: schema.string() }),
    });

    return res;
  }
}

export class TestNoSubActions extends BasicConnector<TestConfig, TestSecrets> {
  protected getResponseErrorMessage(error: AxiosError<ErrorSchema>) {
    return `Error`;
  }
}

export class TestExecutor extends BasicConnector<TestConfig, TestSecrets> {
  public notAFunction: string = 'notAFunction';

  constructor(params: ServiceParams<TestConfig, TestSecrets>) {
    super(params);
    this.registerSubAction({
      name: 'testUrl',
      method: 'not-exist',
      schema: schema.object({}),
    });

    this.registerSubAction({
      name: 'notAFunction',
      method: 'notAFunction',
      schema: schema.object({}),
    });

    this.registerSubAction({
      name: 'echo',
      method: 'echo',
      schema: schema.object({ id: schema.string() }),
    });

    this.registerSubAction({
      name: 'noSchema',
      method: 'noSchema',
      schema: null,
    });

    this.registerSubAction({
      name: 'noData',
      method: 'noData',
      schema: null,
    });

    this.registerSubAction({
      name: 'noAsync',
      method: 'noAsync',
      schema: null,
    });
  }

  protected getResponseErrorMessage(error: AxiosError<ErrorSchema>) {
    return `Error`;
  }

  public async echo({ id }: { id: string }) {
    return Promise.resolve({ id });
  }

  public async noSchema({ id }: { id: string }) {
    return { id };
  }

  public async noData() {}

  public noAsync() {}
}

export class TestCaseConnector extends CaseConnector<TestConfig, TestSecrets> {
  constructor(params: ServiceParams<TestConfig, TestSecrets>) {
    super(params);
  }

  protected getResponseErrorMessage(error: AxiosError<ErrorSchema>) {
    return `Message: ${error.response?.data.errorMessage}. Code: ${error.response?.data.errorCode}`;
  }

  public async createIncident(incident: {
    category: string;
  }): Promise<ExternalServiceIncidentResponse> {
    return {
      id: 'create-incident',
      title: 'Test incident',
      url: 'https://example.com',
      pushedDate: '2022-05-06T09:41:00.401Z',
    };
  }

  public async addComment({
    incidentId,
    comment,
  }: {
    incidentId: string;
    comment: string;
  }): Promise<ExternalServiceIncidentResponse> {
    return {
      id: 'add-comment',
      title: 'Test incident',
      url: 'https://example.com',
      pushedDate: '2022-05-06T09:41:00.401Z',
    };
  }

  public async updateIncident({
    incidentId,
    incident,
  }: {
    incidentId: string;
    incident: { category: string };
  }): Promise<ExternalServiceIncidentResponse> {
    return {
      id: 'update-incident',
      title: 'Test incident',
      url: 'https://example.com',
      pushedDate: '2022-05-06T09:41:00.401Z',
    };
  }

  public async getIncident({ id }: { id: string }): Promise<ExternalServiceIncidentResponse> {
    return {
      id: 'get-incident',
      title: 'Test incident',
      url: 'https://example.com',
      pushedDate: '2022-05-06T09:41:00.401Z',
    };
  }
}
