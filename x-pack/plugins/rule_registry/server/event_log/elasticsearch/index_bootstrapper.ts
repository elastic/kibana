/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { Logger } from 'src/core/server';

import { IndexNames, commonMappingsTemplate, commonSettingsTemplate } from '../common';
import { IndexSpec } from './resources/index_spec';
import { ComponentTemplate, createComponentTemplate } from './resources/index_templates';
import { IIndexManagementGateway } from './index_management_gateway';

interface ConstructorParams {
  gateway: IIndexManagementGateway;
  logger: Logger;
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

  public async bootstrapCommonResources(indexNames: IndexNames): Promise<void> {
    const { indexPrefix, componentTemplates } = indexNames;

    this.logger.debug(`Bootstrapping common resources for "${indexPrefix}" indices`);

    try {
      await Promise.all([
        this.createOrUpdateComponentTemplate(
          componentTemplates.commonMappingsTemplateName,
          createComponentTemplate(commonMappingsTemplate)
        ),
        this.createOrUpdateComponentTemplate(
          componentTemplates.commonSettingsTemplateName,
          createComponentTemplate(commonSettingsTemplate)
        ),
      ]);

      this.logger.debug(`Finished bootstrapping common resources for "${indexPrefix}" indices`);
    } catch (e) {
      this.logger.error(
        `Error bootstrapping common resources for "${indexPrefix}" indices: ${e.message}`
      );
      throw e;
    }
  }

  public async bootstrapLogLevelResources(indexSpec: IndexSpec): Promise<void> {
    const { indexAliasName } = indexSpec.indexNames;

    this.logger.debug(`Bootstrapping index "${indexAliasName}"`);

    try {
      await this.createIlmPolicyIfNotExists(indexSpec);

      const componentTemplatesUpdated = await this.createOrUpdateComponentTemplates(indexSpec);
      const indexTemplateUpdated = await this.createOrUpdateIndexTemplate(indexSpec);
      const anyTemplatesUpdated = componentTemplatesUpdated || indexTemplateUpdated;

      await this.createOrRolloverIndex(indexSpec, anyTemplatesUpdated);

      this.logger.debug(`Finished bootstrapping index "${indexAliasName}"`);
    } catch (e) {
      this.logger.error(`Error bootstrapping index "${indexAliasName}": ${e.message}`);
      throw e;
    }
  }

  private async createIlmPolicyIfNotExists(indexSpec: IndexSpec): Promise<void> {
    const { indexNames, ilmPolicy } = indexSpec;
    const { indexIlmPolicyName } = indexNames;

    const exists = await this.gateway.doesIlmPolicyExist(indexIlmPolicyName);
    if (!exists) {
      await this.gateway.setIlmPolicy(indexIlmPolicyName, ilmPolicy);
    }
  }

  private async createOrUpdateComponentTemplates(indexSpec: IndexSpec): Promise<boolean> {
    const names = indexSpec.indexNames.componentTemplates;

    const results = await Promise.all([
      this.createOrUpdateComponentTemplate(
        names.applicationDefinedTemplateName,
        indexSpec.applicationDefinedTemplate
      ),
      this.createOrUpdateComponentTemplate(
        names.userDefinedTemplateName,
        indexSpec.userDefinedTemplate
      ),
      this.createOrUpdateComponentTemplate(
        names.userDefinedSpaceAwareTemplateName,
        indexSpec.userDefinedSpaceAwareTemplate
      ),
    ]);

    return results.some(Boolean);
  }

  private async createOrUpdateComponentTemplate(
    componentTemplateName: string,
    componentTemplate: ComponentTemplate
  ): Promise<boolean> {
    const result = await this.gateway.getComponentTemplateVersion(componentTemplateName);

    const currentVersion = result.templateVersion;
    const targetVersion = componentTemplate.version;

    const templateNeedsUpdate =
      !result.templateExists ||
      (currentVersion == null && targetVersion != null) ||
      (currentVersion != null && targetVersion != null && currentVersion < targetVersion);

    if (templateNeedsUpdate) {
      await this.gateway.setComponentTemplate(componentTemplateName, componentTemplate);
    }

    return templateNeedsUpdate;
  }

  private async createOrUpdateIndexTemplate(indexSpec: IndexSpec): Promise<boolean> {
    const { indexNames, indexTemplate } = indexSpec;
    const { indexTemplateName } = indexNames;

    const result = await this.gateway.getIndexTemplateVersion(indexTemplateName);

    const currentVersion = result.templateVersion;
    const targetVersion = indexTemplate.version;

    const templateNeedsUpdate =
      !result.templateExists ||
      (currentVersion == null && targetVersion != null) ||
      (currentVersion != null && targetVersion != null && currentVersion < targetVersion);

    if (templateNeedsUpdate) {
      await this.gateway.setIndexTemplate(indexTemplateName, indexTemplate);
    }

    return templateNeedsUpdate;
  }

  private async createOrRolloverIndex(
    indexSpec: IndexSpec,
    anyTemplatesUpdated: boolean
  ): Promise<void> {
    const { indexNames } = indexSpec;
    const { indexAliasName, indexInitialName } = indexNames;

    const indexAliasExists = await this.gateway.doesAliasExist(indexAliasName);
    if (!indexAliasExists) {
      await this.gateway.createIndex(indexInitialName, {
        aliases: {
          [indexAliasName]: {
            is_write_index: true,
          },
        },
      });
    } else if (anyTemplatesUpdated) {
      await this.gateway.rolloverAlias(indexAliasName);
    }
  }
}
