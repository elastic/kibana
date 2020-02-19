/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getIlmPolicy, getIndexTemplate } from './documents';
import { EsContext } from './context';

export async function initializeEs(esContext: EsContext): Promise<boolean> {
  esContext.logger.debug('initializing elasticsearch resources starting');

  try {
    await initializeEsResources(esContext);
  } catch (err) {
    esContext.logger.error(`error initializing elasticsearch resources: ${err.message}`);
    return false;
  }

  esContext.logger.debug('initializing elasticsearch resources complete');
  return true;
}

async function initializeEsResources(esContext: EsContext) {
  const steps = new EsInitializationSteps(esContext);

  await steps.createIlmPolicyIfNotExists();
  await steps.createIndexTemplateIfNotExists();
  await steps.createInitialIndexIfNotExists();
  await steps.migrateIndexTemplate();
}

class EsInitializationSteps {
  constructor(private readonly esContext: EsContext) {
    this.esContext = esContext;
  }

  async createIlmPolicyIfNotExists(): Promise<void> {
    const exists = await this.esContext.esAdapter.doesIlmPolicyExist(
      this.esContext.esNames.ilmPolicy
    );
    if (!exists) {
      await this.esContext.esAdapter.createIlmPolicy(
        this.esContext.esNames.ilmPolicy,
        getIlmPolicy()
      );
    }
  }

  async createIndexTemplateIfNotExists(): Promise<void> {
    const exists = await this.esContext.esAdapter.doesIndexTemplateExist(
      this.esContext.esNames.indexTemplate
    );
    if (!exists) {
      const templateBody = getIndexTemplate(this.esContext.esNames);
      await this.esContext.esAdapter.createIndexTemplate(
        this.esContext.esNames.indexTemplate,
        templateBody
      );
    }
  }

  async createInitialIndexIfNotExists(): Promise<void> {
    const exists = await this.esContext.esAdapter.doesAliasExist(this.esContext.esNames.alias);
    if (!exists) {
      await this.esContext.esAdapter.createIndex(this.esContext.esNames.initialIndex, {
        aliases: {
          [this.esContext.esNames.alias]: {
            is_write_index: true,
          },
        },
      });
    }
  }

  async migrateIndexTemplate() {
    const updatedTemplateBody = getIndexTemplate(this.esContext.esNames);
    const existingTemplate = await this.esContext.esAdapter.getIndexTemplate(
      this.esContext.esNames.indexTemplate
    );

    if (updatedTemplateBody.version > existingTemplate.version) {
      await this.esContext.esAdapter.updateIndexTemplate(
        this.esContext.esNames.indexTemplate,
        updatedTemplateBody
      );
      await this.esContext.esAdapter.rolloverIndex({
        alias: this.esContext.esNames.alias,
        body: {
          conditions: {
            max_age: '0d',
          },
        },
      });
    } else if (updatedTemplateBody.version < existingTemplate.version) {
      throw new Error(
        `Index template belongs to a more recent version of Kibana (${existingTemplate.version})`
      );
    }
  }
}
