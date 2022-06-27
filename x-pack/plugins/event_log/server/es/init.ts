/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { asyncForEach } from '@kbn/std';
import { groupBy } from 'lodash';
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

export interface ParsedIndexAlias extends estypes.IndicesAliasDefinition {
  indexName: string;
  alias: string;
  is_hidden?: boolean;
}

export function parseIndexAliases(aliasInfo: estypes.IndicesGetAliasResponse): ParsedIndexAlias[] {
  return Object.keys(aliasInfo).flatMap((indexName: string) =>
    Object.keys(aliasInfo[indexName].aliases).map((alias: string) => ({
      ...aliasInfo[indexName].aliases[alias],
      indexName,
      alias,
    }))
  );
}

class EsInitializationSteps {
  constructor(private readonly esContext: EsContext) {
    this.esContext = esContext;
  }

  async setExistingIndexTemplatesToHidden() {
    let indexTemplates: estypes.IndicesGetTemplateResponse = {};
    try {
      // look up existing index templates and update index.hidden to true if that
      // setting is currently false or undefined

      // since we are updating to the new index template API and converting new event log
      // indices to hidden in the same PR, we only need to use the legacy template API to
      // look for and update existing event log indices.
      indexTemplates = await this.esContext.esAdapter.getExistingLegacyIndexTemplates(
        this.esContext.esNames.indexPattern
      );
    } catch (err) {
      // errors when trying to get existing index templates
      // should not block the rest of initialization, log the error and move on
      this.esContext.logger.error(`error getting existing index templates - ${err.message}`);
    }

    await asyncForEach(Object.keys(indexTemplates), async (indexTemplateName: string) => {
      try {
        const hidden: string | boolean = indexTemplates[indexTemplateName]?.settings?.index?.hidden;
        // Check to see if this index template is hidden
        if (hidden !== true && hidden !== 'true') {
          this.esContext.logger.debug(
            `setting existing "${indexTemplateName}" index template to hidden.`
          );

          await this.esContext.esAdapter.setLegacyIndexTemplateToHidden(
            indexTemplateName,
            indexTemplates[indexTemplateName]
          );
        }
      } catch (err) {
        // errors when trying to update existing index templates to hidden
        // should not block the rest of initialization, log the error and move on
        this.esContext.logger.error(
          `error setting existing "${indexTemplateName}" index template to hidden - ${err.message}`
        );
      }
    });
  }

  async setExistingIndicesToHidden() {
    let indices: estypes.IndicesGetSettingsResponse = {};
    try {
      // look up existing indices and update index.hidden to true if that
      // setting is currently false or undefined
      indices = await this.esContext.esAdapter.getExistingIndices(
        this.esContext.esNames.indexPattern
      );
    } catch (err) {
      // errors when trying to get existing indices
      // should not block the rest of initialization, log the error and move on
      this.esContext.logger.error(`error getting existing indices - ${err.message}`);
    }
    await asyncForEach(Object.keys(indices), async (indexName: string) => {
      try {
        const hidden: string | boolean | undefined = indices[indexName]?.settings?.index?.hidden;

        // Check to see if this index template is hidden
        if (hidden !== true && hidden !== 'true') {
          this.esContext.logger.debug(`setting existing ${indexName} index to hidden.`);
          await this.esContext.esAdapter.setIndexToHidden(indexName);
        }
      } catch (err) {
        // errors when trying to update existing indices to hidden
        // should not block the rest of initialization, log the error and move on
        this.esContext.logger.error(
          `error setting existing "${indexName}" index to hidden - ${err.message}`
        );
      }
    });
  }

  async setExistingIndexAliasesToHidden() {
    let indexAliases: estypes.IndicesGetAliasResponse = {};
    try {
      // Look up existing index aliases and update index.is_hidden to true if that
      // setting is currently false or undefined
      indexAliases = await this.esContext.esAdapter.getExistingIndexAliases(
        this.esContext.esNames.indexPattern
      );
    } catch (err) {
      // errors when trying to get existing index aliases
      // should not block the rest of initialization, log the error and move on
      this.esContext.logger.error(`error getting existing index aliases - ${err.message}`);
    }

    // Flatten the results so we can group by index alias
    const parsedAliasData = parseIndexAliases(indexAliases);

    // Group by index alias name
    const indexAliasData = groupBy(parsedAliasData, 'alias');

    await asyncForEach(Object.keys(indexAliasData), async (aliasName: string) => {
      try {
        const aliasData = indexAliasData[aliasName];
        const isNotHidden = aliasData.some((data) => data.is_hidden !== true);
        if (isNotHidden) {
          this.esContext.logger.debug(`setting existing "${aliasName}" index alias to hidden.`);
          await this.esContext.esAdapter.setIndexAliasToHidden(
            aliasName,
            indexAliasData[aliasName]
          );
        }
      } catch (err) {
        // errors when trying to set existing index aliases to is_hidden
        // should not block the rest of initialization, log the error and move on
        this.esContext.logger.error(
          `error setting existing "${aliasName}" index aliases - ${err.message}`
        );
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
