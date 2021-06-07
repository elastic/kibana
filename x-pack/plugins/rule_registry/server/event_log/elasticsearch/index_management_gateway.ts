/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { ElasticsearchClient, Logger } from 'src/core/server';
import { IlmPolicy } from '../common';
import { ComponentTemplate, IndexTemplate } from './resources/index_templates';

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
    this.logger.debug(`Checking existence of ILM policy "${policyName}"`);

    try {
      const es = await this.elasticsearch;
      await es.ilm.getLifecycle({ policy: policyName });
      return true;
    } catch (e) {
      if (e.statusCode === 404) {
        return false;
      }

      this.logger.error(e);
      throw new Error(`Error checking existence of ILM policy "${policyName}": ${e.message}`);
    }
  }

  public async setIlmPolicy(policyName: string, policy: IlmPolicy): Promise<void> {
    this.logger.debug(`Setting ILM policy "${policyName}"`);

    try {
      const es = await this.elasticsearch;
      await es.ilm.putLifecycle({
        policy: policyName,
        body: { policy },
      });
    } catch (e) {
      this.logger.error(e);
      throw new Error(`Error setting ILM policy "${policyName}": ${e.message}`);
    }
  }

  public async getComponentTemplateVersion(templateName: string): Promise<TemplateVersion> {
    this.logger.debug(`Getting component template version "${templateName}"`);

    try {
      const es = await this.elasticsearch;
      const response = await es.cluster.getComponentTemplate({
        name: templateName,
      });

      // const response = await es.transport.request({
      //   method: 'GET',
      //   path: `/_component_template/${templateName}`,
      // });

      const template = response.body.component_templates.find(({ name }) => name === templateName);

      if (template) {
        return {
          templateName,
          templateExists: true,
          templateVersion: template.component_template.version ?? undefined,
        };
      } else {
        return {
          templateName,
          templateExists: false,
          templateVersion: undefined,
        };
      }
    } catch (e) {
      this.logger.error(e);
      return {
        templateName,
        templateExists: false,
        templateVersion: undefined,
      };
    }
  }

  public async getIndexTemplateVersion(templateName: string): Promise<TemplateVersion> {
    this.logger.debug(`Getting index template version "${templateName}"`);

    try {
      const es = await this.elasticsearch;
      const response = await es.indices.getIndexTemplate({ name: templateName });

      const template = response.body.index_templates.find(({ name }) => name === templateName);
      if (template) {
        return {
          templateName,
          templateExists: true,
          templateVersion: template.index_template.version ?? undefined,
        };
      } else {
        return {
          templateName,
          templateExists: false,
          templateVersion: undefined,
        };
      }
    } catch (e) {
      this.logger.error(e);
      return {
        templateName,
        templateExists: false,
        templateVersion: undefined,
      };
    }
  }

  public async setComponentTemplate(
    templateName: string,
    template: ComponentTemplate
  ): Promise<void> {
    this.logger.debug(`Setting component template "${templateName}"`);

    try {
      const es = await this.elasticsearch;
      await es.cluster.putComponentTemplate({
        name: templateName,
        body: template,
      });
    } catch (e) {
      this.logger.error(e);
      throw new Error(`Error setting component template "${templateName}": ${e.message}`);
    }
  }

  public async setIndexTemplate(templateName: string, template: IndexTemplate): Promise<void> {
    this.logger.debug(`Setting index template "${templateName}"`);

    try {
      const es = await this.elasticsearch;
      await es.indices.putIndexTemplate({
        name: templateName,
        body: template,
      });
    } catch (e) {
      this.logger.error(e);
      throw new Error(`Error setting index template "${templateName}": ${e.message}`);
    }
  }

  public async doesAliasExist(aliasName: string): Promise<boolean> {
    this.logger.debug(`Checking existence of index alias "${aliasName}"`);

    try {
      const es = await this.elasticsearch;
      const { body } = await es.indices.existsAlias({ name: aliasName });
      return body;
    } catch (e) {
      this.logger.error(e);
      throw new Error(`Error checking existence of index alias "${aliasName}": ${e.message}`);
    }
  }

  public async rolloverAlias(aliasName: string): Promise<void> {
    this.logger.debug(`Starting rollover of index alias "${aliasName}"`);

    try {
      const es = await this.elasticsearch;
      await es.indices.rollover({ alias: aliasName });
    } catch (e) {
      this.logger.error(e);
      throw new Error(`Error in rollover of index alias "${aliasName}": ${e.message}`);
    }
  }

  public async createIndex(indexName: string, body: Record<string, unknown> = {}): Promise<void> {
    this.logger.debug(`Creating index "${indexName}"`);

    try {
      const es = await this.elasticsearch;
      await es.indices.create({
        index: indexName,
        body,
      });
    } catch (e) {
      if (e.body?.error?.type !== 'resource_already_exists_exception') {
        this.logger.error(e);
        throw new Error(`Error creating index "${indexName}": ${e.message}`);
      }
    }
  }
}

export interface TemplateVersion {
  templateName: string;
  templateExists: boolean;
  templateVersion?: number;
}
