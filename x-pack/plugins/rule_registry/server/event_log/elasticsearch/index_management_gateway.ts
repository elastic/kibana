/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { ElasticsearchClient, Logger } from 'src/core/server';
import { IlmPolicy } from './resources/ilm_policy';
import { IndexTemplate } from './resources/index_template';

interface ConstructorParams {
  elasticsearch: Promise<ElasticsearchClient>;
  logger: Logger;
}

export type IIndexManagementGateway = PublicMethodsOf<IndexManagementGateway>;

export class IndexManagementGateway {
  private readonly elasticsearch: Promise<ElasticsearchClient>;
  private readonly logger: Logger;

  constructor(params: ConstructorParams) {
    this.elasticsearch = params.elasticsearch;
    this.logger = params.logger.get('IndexManagementGateway');
  }

  public async doesIlmPolicyExist(policyName: string): Promise<boolean> {
    this.logger.debug(`Checking if ILM policy exists; name="${policyName}"`);

    try {
      const es = await this.elasticsearch;
      await es.transport.request({
        method: 'GET',
        path: `/_ilm/policy/${policyName}`,
      });
    } catch (e) {
      if (e.statusCode === 404) return false;
      throw new Error(`Error checking existence of ILM policy: ${e.message}`);
    }
    return true;
  }

  public async createIlmPolicy(policyName: string, policy: IlmPolicy): Promise<void> {
    this.logger.debug(`Creating ILM policy; name="${policyName}"`);

    try {
      const es = await this.elasticsearch;
      await es.transport.request({
        method: 'PUT',
        path: `/_ilm/policy/${policyName}`,
        body: policy,
      });
    } catch (e) {
      throw new Error(`Error creating ILM policy: ${e.message}`);
    }
  }

  public async doesIndexTemplateExist(templateName: string): Promise<boolean> {
    this.logger.debug(`Checking if index template exists; name="${templateName}"`);

    try {
      const es = await this.elasticsearch;
      const { body } = await es.indices.existsTemplate({ name: templateName });
      return body as boolean;
    } catch (e) {
      throw new Error(`Error checking existence of index template: ${e.message}`);
    }
  }

  public async createIndexTemplate(templateName: string, template: IndexTemplate): Promise<void> {
    this.logger.debug(`Creating index template; name="${templateName}"`);

    try {
      const es = await this.elasticsearch;
      await es.indices.putTemplate({ create: true, name: templateName, body: template });
    } catch (e) {
      // The error message doesn't have a type attribute we can look to guarantee it's due
      // to the template already existing (only long message) so we'll check ourselves to see
      // if the template now exists. This scenario would happen if you startup multiple Kibana
      // instances at the same time.
      const existsNow = await this.doesIndexTemplateExist(templateName);
      if (!existsNow) {
        const error = new Error(`Error creating index template: ${e.message}`);
        Object.assign(error, { wrapped: e });
        throw error;
      }
    }
  }

  public async updateIndexTemplate(templateName: string, template: IndexTemplate): Promise<void> {
    this.logger.debug(`Updating index template; name="${templateName}"`);

    try {
      const { settings, ...templateWithoutSettings } = template;

      const es = await this.elasticsearch;
      await es.indices.putTemplate({
        create: false,
        name: templateName,
        body: templateWithoutSettings,
      });
    } catch (e) {
      throw new Error(`Error updating index template: ${e.message}`);
    }
  }

  public async doesAliasExist(aliasName: string): Promise<boolean> {
    this.logger.debug(`Checking if index alias exists; name="${aliasName}"`);

    try {
      const es = await this.elasticsearch;
      const { body } = await es.indices.existsAlias({ name: aliasName });
      return body as boolean;
    } catch (e) {
      throw new Error(`Error checking existence of initial index: ${e.message}`);
    }
  }

  public async createIndex(indexName: string, body: Record<string, unknown> = {}): Promise<void> {
    this.logger.debug(`Creating index; name="${indexName}"`);
    this.logger.debug(JSON.stringify(body, null, 2));

    try {
      const es = await this.elasticsearch;
      await es.indices.create({
        index: indexName,
        body,
      });
    } catch (e) {
      if (e.body?.error?.type !== 'resource_already_exists_exception') {
        this.logger.error(e);
        this.logger.error(JSON.stringify(e.meta, null, 2));
        throw new Error(`Error creating initial index: ${e.message}`);
      }
    }
  }
}
