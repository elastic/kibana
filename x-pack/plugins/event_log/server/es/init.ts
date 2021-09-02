/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesAlias, IndicesIndexStatePrefixedSettings } from '@elastic/elasticsearch/api/types';
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

  await steps.setExistingAssetsToHidden();
  await steps.createIlmPolicyIfNotExists();
  await steps.createIndexTemplateIfNotExists();
  await steps.createInitialIndexIfNotExists();
}

class EsInitializationSteps {
  constructor(private readonly esContext: EsContext) {
    this.esContext = esContext;
  }

  async setExistingIndexTemplatesToHidden() {
    // Look up existing index templates and update index.hidden to true if that
    // setting is currently false or undefined
    const indexTemplates = await this.esContext.esAdapter.getCurrentIndexTemplates(
      this.esContext.esNames.indexPattern
    );
    Object.keys(indexTemplates).forEach(async (indexTemplateName: string) => {
      // Check to see if this index template is hidden
      if (indexTemplates[indexTemplateName]?.settings?.index?.hidden !== true) {
        await this.esContext.esAdapter.setIndexTemplateToHidden(
          indexTemplateName,
          indexTemplates[indexTemplateName]
        );
      }
    });
  }

  async setExistingIndicesToHidden() {
    // Look up existing indices and update index.hidden to true if that
    // setting is currently false or undefined
    const indices = await this.esContext.esAdapter.getCurrentIndices(
      this.esContext.esNames.indexPattern
    );
    Object.keys(indices).forEach(async (indexName: string) => {
      // Check to see if this index template is hidden
      if (
        (indices[indexName]?.settings as IndicesIndexStatePrefixedSettings)?.index?.hidden !==
        'true'
      ) {
        await this.esContext.esAdapter.setIndexToHidden(indexName);
      }
    });
  }

  async setExistingIndexAliasesToHidden() {
    // Look up existing index aliases and update index.is_hidden to true if that
    // setting is currently false or undefined
    const indexAliases = await this.esContext.esAdapter.getCurrentIndexAliases(
      this.esContext.esNames.indexPattern
    );
    Object.keys(indexAliases).forEach(async (indexName: string) => {
      const aliases = indexAliases[indexName]?.aliases;
      const hasNotHiddenAliases: boolean = Object.keys(aliases).some((alias: string) => {
        return (aliases[alias] as IndicesAlias)?.is_hidden !== true;
      });

      if (hasNotHiddenAliases) {
        await this.esContext.esAdapter.setIndexAliasToHidden(indexName, indexAliases[indexName]);
      }
    });
  }

  async setExistingAssetsToHidden(): Promise<void> {
    await this.setExistingIndexTemplatesToHidden();
    await this.setExistingIndicesToHidden();
    await this.setExistingIndexAliasesToHidden();
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
            is_hidden: true,
          },
        },
      });
    }
  }
}
