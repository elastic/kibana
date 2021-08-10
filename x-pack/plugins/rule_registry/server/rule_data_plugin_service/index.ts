/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';

import { ElasticsearchClient, Logger } from 'kibana/server';
import { get, isEmpty, once } from 'lodash';
import { technicalComponentTemplate } from '../../common/assets/component_templates/technical_component_template';
import {
  DEFAULT_ILM_POLICY_ID,
  ECS_COMPONENT_TEMPLATE_NAME,
  TECHNICAL_COMPONENT_TEMPLATE_NAME,
} from '../../common/assets';
import { ecsComponentTemplate } from '../../common/assets/component_templates/ecs_component_template';
import { defaultLifecyclePolicy } from '../../common/assets/lifecycle_policies/default_lifecycle_policy';
import { RuleDataClient } from '../rule_data_client';
import { incrementIndexName } from './utils';
import { IndexNames } from './index_names';
import { IndexOptions } from './index_options';

const COMMON_RESOURCES = 'common resources shared between all indices';
const INDEX_RESOURCES = 'index resources shared between namespaces';
const BOOTSTRAP_TIMEOUT = 60000;

export interface RuleDataPluginServiceConstructorOptions {
  getClusterClient: () => Promise<ElasticsearchClient>;
  logger: Logger;
  isWriteEnabled: boolean;
  index: string;
}

export class RuleDataPluginService {
  private readonly getClusterClient: () => Promise<ElasticsearchClient>;
  private readonly bootstrapResourcesSharedBetweenAllIndices: () => Promise<void>;

  constructor(private readonly options: RuleDataPluginServiceConstructorOptions) {
    this.getClusterClient = options.getClusterClient;
    this.bootstrapResourcesSharedBetweenAllIndices = this.createBootstrapper(COMMON_RESOURCES, () =>
      this.installResourcesSharedBetweenAllIndices()
    );
  }

  // TODO: https://github.com/elastic/kibana/issues/106432
  public getResourcePrefix() {
    return this.options.index;
  }

  public getResourceName(...relativeNameSegments: string[]) {
    return IndexNames.joinWithDash(this.options.index, ...relativeNameSegments);
  }

  public isWriteEnabled(): boolean {
    return this.options.isWriteEnabled;
  }

  public initializeService(): void {
    this.bootstrapResourcesSharedBetweenAllIndices().catch((e) => {
      this.options.logger.error(e);
    });
  }

  public initializeIndex(indexOptions: IndexOptions): RuleDataClient {
    const { feature, registrationContext, dataset } = indexOptions;

    const indexNames = new IndexNames({
      indexPrefix: this.options.index,
      registrationContext,
      dataset,
    });

    const bootstrapResources = this.createBootstrapper(INDEX_RESOURCES, async () => {
      await this.bootstrapResourcesSharedBetweenAllIndices();
      return await this.installResourcesSharedBetweenIndexNamespaces(indexOptions, indexNames);
    });

    // Start bootstrapping eagerly
    const bootstrapPromise = bootstrapResources();

    return new RuleDataClient({
      feature,
      names: indexNames,
      ready: () => bootstrapPromise,
      getClusterClient: () => this.getClusterClient(),
      isWriteEnabled: this.isWriteEnabled(),
    });
  }

  private createBootstrapper<T>(
    resources: string,
    installResources: () => Promise<T>
  ): () => Promise<T> {
    return once(async () => {
      try {
        return await Promise.race([
          installResources(),
          new Promise<T>((resolve, reject) => {
            setTimeout(() => {
              const msg = `Timeout: it took more than ${BOOTSTRAP_TIMEOUT}ms`;
              reject(new Error(msg));
            }, BOOTSTRAP_TIMEOUT);
          }),
        ]);
      } catch (e) {
        this.options.logger.error(e);

        const reason = e?.message || 'Unknown reason';
        throw new Error(`Failure installing ${resources}. ${reason}`);
      }
    });
  }

  private async installResourcesSharedBetweenAllIndices(): Promise<void> {
    const { logger } = this.options;

    if (!this.isWriteEnabled()) {
      logger.info(`Write is disabled; not installing ${COMMON_RESOURCES}`);
      return;
    }

    logger.info(`Installing ${COMMON_RESOURCES}`);

    await this.createOrUpdateLifecyclePolicy({
      policy: this.getResourceName(DEFAULT_ILM_POLICY_ID),
      body: defaultLifecyclePolicy,
    });

    await this.createOrUpdateComponentTemplate({
      name: this.getResourceName(TECHNICAL_COMPONENT_TEMPLATE_NAME),
      body: technicalComponentTemplate,
    });

    await this.createOrUpdateComponentTemplate({
      name: this.getResourceName(ECS_COMPONENT_TEMPLATE_NAME),
      body: ecsComponentTemplate,
    });

    logger.info(`Installed ${COMMON_RESOURCES}`);
  }

  private async installResourcesSharedBetweenIndexNamespaces(
    indexOptions: IndexOptions,
    indexNames: IndexNames
  ): Promise<void> {
    const { logger } = this.options;
    const { componentTemplateRefs, componentTemplates, indexTemplate, ilmPolicy } = indexOptions;

    if (!this.isWriteEnabled()) {
      logger.info(`Write is disabled; not installing ${INDEX_RESOURCES}`);
      return;
    }

    logger.info(`Installing ${INDEX_RESOURCES}`);

    if (ilmPolicy != null) {
      await this.createOrUpdateLifecyclePolicy({
        policy: indexNames.ilmPolicyName,
        body: { policy: ilmPolicy },
      });
    }

    await Promise.all(
      componentTemplates.map(async (ct) => {
        await this.createOrUpdateComponentTemplate({
          name: ct.name,
          body: {
            // TODO: difference?
            // template: {
            //   settings: ct.settings,
            //   mappings: ct.mappings,
            //   version: ct.version,
            //   _meta: ct._meta,
            // },
            template: { settings: {} },
            settings: ct.settings,
            mappings: ct.mappings,
            version: ct.version,
            _meta: ct._meta,
          },
        });
      })
    );

    const referencedComponents = componentTemplateRefs;
    const ownComponents = componentTemplates.map((ct) => ct.name);
    const technicalComponents = [this.getResourceName(TECHNICAL_COMPONENT_TEMPLATE_NAME)];

    await this.createOrUpdateIndexTemplate({
      name: indexNames.getIndexTemplateName(''), // TODO: should be namespaced,
      body: {
        index_patterns: [indexNames.indexBasePattern], // TODO: should be namespaced
        composed_of: [...referencedComponents, ...ownComponents, ...technicalComponents], // order matters
        version: indexTemplate.version,
        _meta: indexTemplate._meta,
      },
    });

    await this.updateIndexMappingsMatchingPattern(indexNames.indexBasePattern);

    logger.info(`Installed ${INDEX_RESOURCES}`);
  }

  private async createOrUpdateLifecyclePolicy(policy: estypes.IlmPutLifecycleRequest) {
    this.options.logger.debug(`Installing lifecycle policy ${policy.policy}`);

    const clusterClient = await this.getClusterClient();
    return clusterClient.ilm.putLifecycle(policy);
  }

  private async createOrUpdateComponentTemplate(
    template: estypes.ClusterPutComponentTemplateRequest
  ) {
    this.options.logger.debug(`Installing component template ${template.name}`);

    const clusterClient = await this.getClusterClient();
    return clusterClient.cluster.putComponentTemplate(template);
  }

  private async createOrUpdateIndexTemplate(template: estypes.IndicesPutIndexTemplateRequest) {
    this.options.logger.debug(`Installing index template ${template.name}`);

    const clusterClient = await this.getClusterClient();
    const { body: simulateResponse } = await clusterClient.indices.simulateTemplate(template);

    const mappings: estypes.MappingTypeMapping = simulateResponse.template.mappings;

    if (isEmpty(mappings)) {
      throw new Error(
        'No mappings would be generated for this index, possibly due to failed/misconfigured bootstrapping'
      );
    }

    return clusterClient.indices.putIndexTemplate(template);
  }

  private async updateIndexMappingsMatchingPattern(pattern: string) {
    const clusterClient = await this.getClusterClient();
    const { body: aliasesResponse } = await clusterClient.indices.getAlias({ index: pattern });

    const writeIndicesAndAliases: Array<{ index: string; alias: string }> = [];
    Object.entries(aliasesResponse).forEach(([index, aliases]) => {
      Object.entries(aliases.aliases).forEach(([aliasName, aliasProperties]) => {
        if (aliasProperties.is_write_index) {
          writeIndicesAndAliases.push({ index, alias: aliasName });
        }
      });
    });

    await Promise.all(
      writeIndicesAndAliases.map((indexAndAlias) =>
        this.updateAliasWriteIndexMapping(indexAndAlias)
      )
    );
  }

  private async updateAliasWriteIndexMapping({ index, alias }: { index: string; alias: string }) {
    const clusterClient = await this.getClusterClient();

    const simulatedIndexMapping = await clusterClient.indices.simulateIndexTemplate({
      name: index,
    });
    const simulatedMapping = get(simulatedIndexMapping, ['body', 'template', 'mappings']);
    try {
      await clusterClient.indices.putMapping({
        index,
        body: simulatedMapping,
      });
      return;
    } catch (err) {
      if (err.meta?.body?.error?.type !== 'illegal_argument_exception') {
        /**
         * We skip the rollover if we catch anything except for illegal_argument_exception - that's the error
         * returned by ES when the mapping update contains a conflicting field definition (e.g., a field changes types).
         * We expect to get that error for some mapping changes we might make, and in those cases,
         * we want to continue to rollover the index. Other errors are unexpected.
         */
        this.options.logger.error(`Failed to PUT mapping for alias ${alias}: ${err.message}`);
        return;
      }
      const newIndexName = incrementIndexName(index);
      if (newIndexName == null) {
        this.options.logger.error(`Failed to increment write index name for alias: ${alias}`);
        return;
      }
      try {
        await clusterClient.indices.rollover({
          alias,
          new_index: newIndexName,
        });
      } catch (e) {
        /**
         * If we catch resource_already_exists_exception, that means that the index has been
         * rolled over already — nothing to do for us in this case.
         */
        if (e?.meta?.body?.error?.type !== 'resource_already_exists_exception') {
          this.options.logger.error(`Failed to rollover index for alias ${alias}: ${e.message}`);
        }
      }
    }
  }
}
