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
  let ilmExists: boolean;

  // create the ilm policy, if required
  ilmExists = await steps.doesIlmPolicyExist();
  if (!ilmExists) {
    ilmExists = await steps.createIlmPolicy();
  }

  if (!(await steps.doesIndexTemplateExist())) {
    await steps.createIndexTemplate({ ilmExists });
  }

  if (!(await steps.doesInitialIndexExist())) {
    await steps.createInitialIndex();
  }
}

interface AddTemplateOpts {
  ilmExists: boolean;
}

class EsInitializationSteps {
  private esContext: EsContext;

  constructor(esContext: EsContext) {
    this.esContext = esContext;
  }

  async doesIlmPolicyExist(): Promise<boolean> {
    const request = {
      method: 'GET',
      path: `_ilm/policy/${this.esContext.esNames.ilmPolicy}`,
    };
    try {
      await this.esContext.callEs('transport.request', request);
    } catch (err) {
      if (err.statusCode === 404) return false;
      // TODO: remove following once kibana user can access ilm
      if (err.statusCode === 403) return false;

      throw new Error(`error checking existance of ilm policy: ${err.message}`);
    }
    return true;
  }

  async createIlmPolicy(): Promise<boolean> {
    const request = {
      method: 'PUT',
      path: `_ilm/policy/${this.esContext.esNames.ilmPolicy}`,
      body: getIlmPolicy(),
    };
    try {
      await this.esContext.callEs('transport.request', request);
    } catch (err) {
      // TODO: remove following once kibana user can access ilm
      if (err.statusCode === 403) return false;
      throw new Error(`error creating ilm policy: ${err.message}`);
    }
    return true;
  }

  async doesIndexTemplateExist(): Promise<boolean> {
    const name = this.esContext.esNames.indexTemplate;
    let result;
    try {
      result = await this.esContext.callEs('indices.existsTemplate', { name });
    } catch (err) {
      throw new Error(`error checking existance of index template: ${err.message}`);
    }
    return result as boolean;
  }

  async createIndexTemplate(opts: AddTemplateOpts): Promise<void> {
    const templateBody = getIndexTemplate(this.esContext.esNames, opts.ilmExists);
    const addTemplateParams = {
      create: true,
      name: this.esContext.esNames.indexTemplate,
      body: templateBody,
    };
    try {
      await this.esContext.callEs('indices.putTemplate', addTemplateParams);
    } catch (err) {
      throw new Error(`error creating index template: ${err.message}`);
    }
  }

  async doesInitialIndexExist(): Promise<boolean> {
    const name = this.esContext.esNames.alias;
    let result;
    try {
      result = await this.esContext.callEs('indices.existsAlias', { name });
    } catch (err) {
      throw new Error(`error checking existance of initial index: ${err.message}`);
    }
    return result as boolean;
  }

  async createInitialIndex(): Promise<void> {
    const index = this.esContext.esNames.initialIndex;
    try {
      await this.esContext.callEs('indices.create', { index });
    } catch (err) {
      throw new Error(`error creating initial index: ${err.message}`);
    }
  }

  debug(message: string) {
    this.esContext.logger.debug(message);
  }

  warn(message: string) {
    this.esContext.logger.warn(message);
  }
}
