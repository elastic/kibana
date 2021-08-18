/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, isEmpty } from 'lodash';
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

import { IndexInfo } from './index_info';
import { incrementIndexName } from './utils';

const INSTALLATION_TIMEOUT = 20 * 60 * 1000; // 20 minutes

interface ConstructorOptions {
  getResourceName(relativeName: string): string;
  getClusterClient: () => Promise<ElasticsearchClient>;
  logger: Logger;
  isWriteEnabled: boolean;
}

export class ResourceInstaller {
  constructor(private readonly options: ConstructorOptions) {}

  private async installWithTimeout(
    resources: string,
    installer: () => Promise<void>
  ): Promise<void> {
    try {
      const installResources = async (): Promise<void> => {
        const { logger, isWriteEnabled } = this.options;

        if (!isWriteEnabled) {
          logger.info(`Write is disabled; not installing ${resources}`);
          return;
        }

        logger.info(`Installing ${resources}`);
        await installer();
        logger.info(`Installed ${resources}`);
      };

      const throwTimeoutException = (): Promise<void> => {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            const msg = `Timeout: it took more than ${INSTALLATION_TIMEOUT}ms`;
            reject(new Error(msg));
          }, INSTALLATION_TIMEOUT);
        });
      };

      await Promise.race([installResources(), throwTimeoutException()]);
    } catch (e) {
      this.options.logger.error(e);

      const reason = e?.message || 'Unknown reason';
      throw new Error(`Failure installing ${resources}. ${reason}`);
    }
  }

  // -----------------------------------------------------------------------------------------------
  // Common resources

  /**
   * Installs common, library-level resources shared between all indices:
   *   - default ILM policy
   *   - component template containing technical fields
   *   - component template containing all standard ECS fields
   */
  public async installCommonResources(): Promise<void> {
    await this.installWithTimeout('common resources shared between all indices', async () => {
      const { getResourceName } = this.options;

      // We can install them in parallel
      await Promise.all([
        this.createOrUpdateLifecyclePolicy({
          policy: getResourceName(DEFAULT_ILM_POLICY_ID),
          body: defaultLifecyclePolicy,
        }),

        this.createOrUpdateComponentTemplate({
          name: getResourceName(TECHNICAL_COMPONENT_TEMPLATE_NAME),
          body: technicalComponentTemplate,
        }),

        this.createOrUpdateComponentTemplate({
          name: getResourceName(ECS_COMPONENT_TEMPLATE_NAME),
          body: ecsComponentTemplate,
        }),
      ]);
    });
  }

  // -----------------------------------------------------------------------------------------------
  // Index-level resources

  /**
   * Installs index-level resources shared between all namespaces of this index:
   *   - custom ILM policy if it was provided
   *   - component templates
   *   - attempts to update mappings of existing concrete indices
   */
  public async installIndexLevelResources(indexInfo: IndexInfo): Promise<void> {
    await this.installWithTimeout(`resources for index ${indexInfo.baseName}`, async () => {
      const { componentTemplates, ilmPolicy } = indexInfo.indexOptions;

      if (ilmPolicy != null) {
        await this.createOrUpdateLifecyclePolicy({
          policy: indexInfo.getIlmPolicyName(),
          body: { policy: ilmPolicy },
        });
      }

      await Promise.all(
        componentTemplates.map(async (ct) => {
          await this.createOrUpdateComponentTemplate({
            name: indexInfo.getComponentTemplateName(ct.name),
            body: {
              template: {
                settings: ct.settings ?? {},
                mappings: ct.mappings,
              },
              version: ct.version,
              _meta: ct._meta,
            },
          });
        })
      );

      // TODO: Update all existing namespaced index templates matching this index' base name

      await this.updateIndexMappings(indexInfo);
    });
  }

  private async updateIndexMappings(indexInfo: IndexInfo) {
    const { logger, getClusterClient } = this.options;
    const clusterClient = await getClusterClient();

    logger.debug(`Updating mappings of existing concrete indices for ${indexInfo.baseName}`);

    const { body: aliasesResponse } = await clusterClient.indices.getAlias({
      index: indexInfo.basePattern,
    });

    const writeIndicesAndAliases = Object.entries(aliasesResponse).flatMap(([index, { aliases }]) =>
      Object.entries(aliases)
        .filter(([, aliasProperties]) => aliasProperties.is_write_index)
        .map(([aliasName]) => ({ index, alias: aliasName }))
    );

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

  // -----------------------------------------------------------------------------------------------
  // Namespace-level resources

  /**
   * Installs resources tied to concrete namespace of an index:
   *   - namespaced index template
   *   - concrete index (write target) if it doesn't exist
   */
  public async installNamespaceLevelResources(
    indexInfo: IndexInfo,
    namespace: string
  ): Promise<void> {
    await this.createWriteTargetIfNeeded(indexInfo, namespace);
  }

  private async createWriteTargetIfNeeded(indexInfo: IndexInfo, namespace: string) {
    const { logger, getClusterClient } = this.options;
    const clusterClient = await getClusterClient();

    const primaryNamespacedAlias = indexInfo.getPrimaryAlias(namespace);
    const primaryNamespacedPattern = indexInfo.getPrimaryAliasPattern(namespace);
    const initialIndexName = indexInfo.getConcreteIndexInitialName(namespace);

    logger.debug(`Creating write target for ${primaryNamespacedAlias}`);

    try {
      // When a new namespace is created we expect getAlias to return a 404 error,
      // we'll catch it below and continue on. A non-404 error is a real problem so we throw.

      // It's critical that we specify *both* the index pattern and alias in this request. The alias prevents the
      // request from finding other namespaces that could match the -* part of the index pattern
      // (see https://github.com/elastic/kibana/issues/107704). The index pattern prevents the request from
      // finding legacy .siem-signals indices that we add the alias to for backwards compatibility reasons. Together,
      // the index pattern and alias should ensure that we retrieve only the "new" backing indices for this
      // particular alias.
      const { body: aliases } = await clusterClient.indices.getAlias({
        index: primaryNamespacedPattern,
        name: primaryNamespacedAlias,
      });

      // If we find backing indices for the alias here, we shouldn't be making a new concrete index -
      // either one of the indices is the write index so we return early because we don't need a new write target,
      // or none of them are the write index so we'll throw an error because one of the existing indices should have
      // been the write target
      if (
        Object.values(aliases).some(
          (aliasesObject) => aliasesObject.aliases[primaryNamespacedAlias].is_write_index
        )
      ) {
        return;
      } else {
        throw new Error(
          `Indices matching pattern ${primaryNamespacedPattern} exist but none are set as the write index for alias ${primaryNamespacedAlias}`
        );
      }
    } catch (err) {
      // 404 is expected if the alerts-as-data index hasn't been created yet
      if (err.statusCode !== 404) {
        throw err;
      }
    }

    await this.installNamespacedIndexTemplate(indexInfo, namespace);

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
        if (!existingIndices[initialIndexName]?.aliases?.[primaryNamespacedAlias]?.is_write_index) {
          throw Error(
            `Attempted to create index: ${initialIndexName} as the write index for alias: ${primaryNamespacedAlias}, but the index already exists and is not the write index for the alias`
          );
        }
      } else {
        throw err;
      }
    }
  }

  private async installNamespacedIndexTemplate(indexInfo: IndexInfo, namespace: string) {
    const { logger, getResourceName } = this.options;
    const {
      componentTemplateRefs,
      componentTemplates,
      indexTemplate,
      ilmPolicy,
    } = indexInfo.indexOptions;

    const primaryNamespacedAlias = indexInfo.getPrimaryAlias(namespace);
    const primaryNamespacedPattern = indexInfo.getPrimaryAliasPattern(namespace);
    const secondaryNamespacedAlias = indexInfo.getSecondaryAlias(namespace);

    logger.debug(`Installing index template for ${primaryNamespacedAlias}`);

    const technicalComponentNames = [getResourceName(TECHNICAL_COMPONENT_TEMPLATE_NAME)];
    const referencedComponentNames = componentTemplateRefs.map((ref) => getResourceName(ref));
    const ownComponentNames = componentTemplates.map((template) =>
      indexInfo.getComponentTemplateName(template.name)
    );
    const ilmPolicyName = ilmPolicy
      ? indexInfo.getIlmPolicyName()
      : getResourceName(DEFAULT_ILM_POLICY_ID);

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
      name: indexInfo.getIndexTemplateName(namespace),
      body: {
        index_patterns: [primaryNamespacedPattern],

        // Order matters:
        // - first go external component templates referenced by this index (e.g. the common full ECS template)
        // - then we include own component templates registered with this index
        // - finally, we include technical component templates to make sure the index gets all the
        //   mappings and settings required by all Kibana plugins using rule registry to work properly
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
          ...indexTemplate._meta,
          namespace,
        },

        version: indexTemplate.version,

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
