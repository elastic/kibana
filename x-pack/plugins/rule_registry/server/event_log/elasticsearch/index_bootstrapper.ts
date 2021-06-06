/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { Logger } from 'src/core/server';

import { IndexNames } from './resources/index_names';
import { IndexMappings } from './resources/index_mappings';
import { createIndexTemplate } from './resources/index_template';
import { IlmPolicy, defaultIlmPolicy } from './resources/ilm_policy';
import { IIndexManagementGateway } from './index_management_gateway';

interface ConstructorParams {
  gateway: IIndexManagementGateway;
  logger: Logger;
}

export interface IndexSpecification {
  indexNames: IndexNames;
  indexMappings: IndexMappings;
  ilmPolicy?: IlmPolicy;
}

export type IIndexBootstrapper = PublicMethodsOf<IndexBootstrapper>;

// TODO: Converge with the logic of .siem-signals index bootstrapping
// x-pack/plugins/security_solution/server/lib/detection_engine/routes/index/create_index_route.ts

// TODO: Handle race conditions and potential errors between multiple instances of Kibana
// trying to bootstrap the same index. Possible options:
//   - robust idempotent logic with error handling
//   - leveraging task_manager to make sure bootstrapping is run only once at a time
//   - using some sort of distributed lock
// Maybe we can check how Saved Objects service bootstraps .kibana index

export class IndexBootstrapper {
  private readonly gateway: IIndexManagementGateway;
  private readonly logger: Logger;

  constructor(params: ConstructorParams) {
    this.gateway = params.gateway;
    this.logger = params.logger.get('IndexBootstrapper');
  }

  public async run(indexSpec: IndexSpecification): Promise<boolean> {
    this.logger.debug('bootstrapping elasticsearch resources starting');

    try {
      const { indexNames, indexMappings, ilmPolicy } = indexSpec;
      await this.createIlmPolicyIfNotExists(indexNames, ilmPolicy);
      await this.createIndexTemplateIfNotExists(indexNames, indexMappings);
      await this.createInitialIndexIfNotExists(indexNames);
    } catch (err) {
      this.logger.error(`error bootstrapping elasticsearch resources: ${err.message}`);
      return false;
    }

    this.logger.debug('bootstrapping elasticsearch resources complete');
    return true;
  }

  private async createIlmPolicyIfNotExists(names: IndexNames, policy?: IlmPolicy): Promise<void> {
    const { indexIlmPolicyName } = names;

    const exists = await this.gateway.doesIlmPolicyExist(indexIlmPolicyName);
    if (!exists) {
      const ilmPolicy = policy ?? defaultIlmPolicy;
      await this.gateway.createIlmPolicy(indexIlmPolicyName, ilmPolicy);
    }
  }

  private async createIndexTemplateIfNotExists(
    names: IndexNames,
    mappings: IndexMappings
  ): Promise<void> {
    const { indexTemplateName } = names;

    const templateVersion = 1; // TODO: get from EventSchema definition
    const template = createIndexTemplate(names, mappings, templateVersion);

    const exists = await this.gateway.doesIndexTemplateExist(indexTemplateName);
    if (!exists) {
      await this.gateway.createIndexTemplate(indexTemplateName, template);
    } else {
      await this.gateway.updateIndexTemplate(indexTemplateName, template);
    }
  }

  private async createInitialIndexIfNotExists(names: IndexNames): Promise<void> {
    const { indexAliasName, indexInitialName } = names;

    const exists = await this.gateway.doesAliasExist(indexAliasName);
    if (!exists) {
      await this.gateway.createIndex(indexInitialName, {
        aliases: {
          [indexAliasName]: {
            is_write_index: true,
          },
        },
      });
    }
  }
}
