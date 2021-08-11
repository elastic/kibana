/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, isEmpty, once } from 'lodash';
import { estypes } from '@elastic/elasticsearch';

import { ElasticsearchClient, Logger } from 'kibana/server';

import {
  DEFAULT_ILM_POLICY_ID,
  ECS_COMPONENT_TEMPLATE_NAME,
  TECHNICAL_COMPONENT_TEMPLATE_NAME,
} from '../../common/assets';
import { technicalComponentTemplate } from '../../common/assets/component_templates/technical_component_template';
import { ecsComponentTemplate } from '../../common/assets/component_templates/ecs_component_template';
import { defaultLifecyclePolicy } from '../../common/assets/lifecycle_policies/default_lifecycle_policy';

import { ResourceNames } from './resource_names';
import { IndexNames } from './index_names';
import { IndexOptions } from './index_options';
import { incrementIndexName } from './utils';

export enum Resources {
  common = 'common resources shared between all indices',
  forIndex = 'resources for a particular index',
  forNamespace = 'resources for a particular namespace',
}

const INSTALLATION_TIMEOUT = 60000;

interface ConstructorOptions {
  resourceNames: ResourceNames;
  getClusterClient: () => Promise<ElasticsearchClient>;
  logger: Logger;
  isWriteEnabled: boolean;
}

export class ResourceInstaller {
  constructor(private readonly options: ConstructorOptions) {}

  private getResourceName(...relativeNameSegments: string[]) {
    return this.options.resourceNames.getFullName(...relativeNameSegments);
  }

  public memoizeInstallation<T>(
    resources: Resources,
    installResources: () => Promise<T>
  ): () => Promise<T> {
    return once(async () => {
      try {
        return await Promise.race([
          installResources(),
          new Promise<T>((resolve, reject) => {
            setTimeout(() => {
              const msg = `Timeout: it took more than ${INSTALLATION_TIMEOUT}ms`;
              reject(new Error(msg));
            }, INSTALLATION_TIMEOUT);
          }),
        ]);
      } catch (e) {
        this.options.logger.error(e);

        const reason = e?.message || 'Unknown reason';
        throw new Error(`Failure installing ${resources}. ${reason}`);
      }
    });
  }

  public async installResourcesSharedBetweenAllIndices(): Promise<void> {
    const { logger, isWriteEnabled } = this.options;

    if (!isWriteEnabled) {
      logger.info(`Write is disabled; not installing ${Resources.common}`);
      return;
    }

    logger.info(`Installing ${Resources.common}`);

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

    logger.info(`Installed ${Resources.common}`);
  }

  public async installResourcesSharedBetweenIndexNamespaces(
    indexOptions: IndexOptions,
    indexNames: IndexNames
  ): Promise<void> {
    const { logger, isWriteEnabled } = this.options;
    const { componentTemplates, ilmPolicy } = indexOptions;

    if (!isWriteEnabled) {
      logger.info(`Write is disabled; not installing ${Resources.forIndex}`);
      return;
    }

    logger.info(`Installing ${Resources.forIndex}`);

    if (ilmPolicy != null) {
      await this.createOrUpdateLifecyclePolicy({
        policy: indexNames.getIlmPolicyName(),
        body: { policy: ilmPolicy },
      });
    }

    await Promise.all(
      componentTemplates.map(async (ct) => {
        await this.createOrUpdateComponentTemplate({
          name: indexNames.getComponentTemplateName(ct.name),
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

    // TODO: Update all existing namespaced index templates matching this index' base name

    await this.updateIndexMappings(indexNames);

    logger.info(`Installed ${Resources.forIndex}`);
  }

  private async updateIndexMappings(indexNames: IndexNames) {
    const { logger, getClusterClient } = this.options;
    const clusterClient = await getClusterClient();

    logger.debug(`Updating mappings of existing indices`);

    const { body: aliasesResponse } = await clusterClient.indices.getAlias({
      index: indexNames.basePattern,
    });

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
    const { logger, getClusterClient } = this.options;
    const clusterClient = await getClusterClient();

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
        logger.error(`Failed to PUT mapping for alias ${alias}: ${err.message}`);
        return;
      }
      const newIndexName = incrementIndexName(index);
      if (newIndexName == null) {
        logger.error(`Failed to increment write index name for alias: ${alias}`);
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
          logger.error(`Failed to rollover index for alias ${alias}: ${e.message}`);
        }
      }
    }
  }

  public async createWriteTargetIfNeeded(
    indexOptions: IndexOptions,
    indexNames: IndexNames,
    namespace: string
  ) {
    const { logger, getClusterClient } = this.options;
    const clusterClient = await getClusterClient();

    const primaryNamespacedAlias = indexNames.getPrimaryAlias(namespace);
    const primaryNamespacedPattern = indexNames.getPrimaryAliasPattern(namespace);
    const initialIndexName = indexNames.getConcreteIndexInitialName(namespace);

    logger.debug(`Creating write target for ${primaryNamespacedAlias}`);

    const { body: indicesExist } = await clusterClient.indices.exists({
      index: primaryNamespacedPattern,
      allow_no_indices: false,
    });

    if (!indicesExist) {
      await this.installNamespacedIndexTemplate(indexOptions, indexNames, namespace);

      try {
        await clusterClient.indices.create({
          index: initialIndexName,
          body: {
            aliases: {
              [primaryNamespacedAlias]: {
                is_write_index: true,
              },
            },
          },
        });
      } catch (err) {
        // If the index already exists and it's the write index for the alias,
        // something else created it so suppress the error. If it's not the write
        // index, that's bad, throw an error.
        if (err?.meta?.body?.error?.type === 'resource_already_exists_exception') {
          const { body: existingIndices } = await clusterClient.indices.get({
            index: initialIndexName,
          });
          if (
            !existingIndices[initialIndexName]?.aliases?.[primaryNamespacedAlias]?.is_write_index
          ) {
            throw Error(
              `Attempted to create index: ${initialIndexName} as the write index for alias: ${primaryNamespacedAlias}, but the index already exists and is not the write index for the alias`
            );
          }
        } else {
          throw err;
        }
      }
    } else {
      // If we find indices matching the pattern, then we expect one of them to be the write index for the alias.
      // Throw an error if none of them are the write index.
      const { body: aliasesResponse } = await clusterClient.indices.getAlias({
        index: primaryNamespacedPattern,
      });
      if (
        !Object.entries(aliasesResponse).some(
          ([_, aliasesObject]) => aliasesObject.aliases[primaryNamespacedAlias]?.is_write_index
        )
      ) {
        throw Error(
          `Indices matching pattern ${primaryNamespacedPattern} exist but none are set as the write index for alias ${primaryNamespacedAlias}`
        );
      }
    }
  }

  private async installNamespacedIndexTemplate(
    indexOptions: IndexOptions,
    indexNames: IndexNames,
    namespace: string
  ) {
    const { logger } = this.options;

    const primaryNamespacedAlias = indexNames.getPrimaryAlias(namespace);
    const primaryNamespacedPattern = indexNames.getPrimaryAliasPattern(namespace);
    const secondaryNamespacedAlias = indexNames.getSecondaryAlias(namespace);

    logger.debug(`Installing index template for ${primaryNamespacedAlias}`);

    const technicalComponentNames = [this.getResourceName(TECHNICAL_COMPONENT_TEMPLATE_NAME)];
    const referencedComponentNames = indexOptions.componentTemplateRefs.map((ref) =>
      this.getResourceName(ref)
    );
    const ownComponentNames = indexOptions.componentTemplates.map((template) =>
      indexNames.getComponentTemplateName(template.name)
    );
    const ilmPolicyName = indexOptions.ilmPolicy
      ? indexNames.getIlmPolicyName()
      : this.getResourceName(DEFAULT_ILM_POLICY_ID);

    // TODO: need a way to update this template if/when we decide to make changes to the
    // built in index template. Probably do it as part of updateIndexMappingsForAsset?
    // (Before upgrading any indices, find and upgrade all namespaced index templates - component templates
    // will already have been upgraded by solutions or rule registry, in the case of technical/ECS templates)
    // With the current structure, it's tricky because the index template creation
    // depends on both the namespace and secondary alias, both of which are not currently available
    // to updateIndexMappingsForAsset. We can make the secondary alias available since
    // it's known at plugin startup time, but
    // the namespace values can really only come from the existing templates that we're trying to update
    // - maybe we want to store the namespace as a _meta field on the index template for easy retrieval
    await this.createOrUpdateIndexTemplate({
      name: indexNames.getIndexTemplateName(namespace),
      body: {
        index_patterns: [primaryNamespacedPattern],

        // Order matters:
        // - first go external component templates referenced by this index (e.g. the common full ECS template)
        // - then we include own component templates registered with this index
        // - finally, we include technical component templates to make sure the index gets all the
        //   mappings and settings required by all Kibana plugins using rule_registry to work properly
        composed_of: [
          ...referencedComponentNames,
          ...ownComponentNames,
          ...technicalComponentNames,
        ],

        template: {
          settings: {
            'index.lifecycle': {
              name: ilmPolicyName,
              // TODO: fix the types in the ES package, they don't include rollover_alias???
              // @ts-expect-error
              rollover_alias: primaryNamespacedAlias,
            },
          },
          aliases:
            secondaryNamespacedAlias != null
              ? {
                  [secondaryNamespacedAlias]: {
                    is_write_index: false,
                  },
                }
              : undefined,
        },

        _meta: {
          ...indexOptions.indexTemplate._meta,
          namespace,
        },

        version: indexOptions.indexTemplate.version,

        // By setting the priority to namespace.length, we ensure that if one namespace is a prefix of another namespace
        // then newly created indices will use the matching template with the *longest* namespace
        priority: namespace.length,
      },
    });
  }

  // -----------------------------------------------------------------------------------------------
  // Helpers

  private async createOrUpdateLifecyclePolicy(policy: estypes.IlmPutLifecycleRequest) {
    const { logger, getClusterClient } = this.options;
    const clusterClient = await getClusterClient();

    logger.debug(`Installing lifecycle policy ${policy.policy}`);
    return clusterClient.ilm.putLifecycle(policy);
  }

  private async createOrUpdateComponentTemplate(
    template: estypes.ClusterPutComponentTemplateRequest
  ) {
    const { logger, getClusterClient } = this.options;
    const clusterClient = await getClusterClient();

    logger.debug(`Installing component template ${template.name}`);
    return clusterClient.cluster.putComponentTemplate(template);
  }

  private async createOrUpdateIndexTemplate(template: estypes.IndicesPutIndexTemplateRequest) {
    const { logger, getClusterClient } = this.options;
    const clusterClient = await getClusterClient();

    logger.debug(`Installing index template ${template.name}`);

    const { body: simulateResponse } = await clusterClient.indices.simulateTemplate(template);
    const mappings: estypes.MappingTypeMapping = simulateResponse.template.mappings;

    if (isEmpty(mappings)) {
      throw new Error(
        'No mappings would be generated for this index, possibly due to failed/misconfigured bootstrapping'
      );
    }

    return clusterClient.indices.putIndexTemplate(template);
  }
}
