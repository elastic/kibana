/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom, type Observable } from 'rxjs';
import { get, isEmpty } from 'lodash';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { ElasticsearchClient, Logger } from '@kbn/core/server';

import type { PublicMethodsOf } from '@kbn/utility-types';
import {
  DEFAULT_ALERTS_ILM_POLICY,
  DEFAULT_ALERTS_ILM_POLICY_NAME,
  ECS_COMPONENT_TEMPLATE_NAME,
} from '@kbn/alerting-plugin/server';
import { TECHNICAL_COMPONENT_TEMPLATE_NAME } from '../../common/assets';
import { technicalComponentTemplate } from '../../common/assets/component_templates/technical_component_template';
import { ecsComponentTemplate } from '../../common/assets/component_templates/ecs_component_template';

import type { IndexInfo } from './index_info';

const INSTALLATION_TIMEOUT = 20 * 60 * 1000; // 20 minutes
const TOTAL_FIELDS_LIMIT = 2500;
interface ConstructorOptions {
  getResourceName(relativeName: string): string;
  getClusterClient: () => Promise<ElasticsearchClient>;
  logger: Logger;
  isWriteEnabled: boolean;
  disabledRegistrationContexts: string[];
  areFrameworkAlertsEnabled: boolean;
  pluginStop$: Observable<void>;
}

export type IResourceInstaller = PublicMethodsOf<ResourceInstaller>;
export class ResourceInstaller {
  constructor(private readonly options: ConstructorOptions) {}

  private async installWithTimeout(
    resources: string,
    installer: () => Promise<void>
  ): Promise<void> {
    try {
      let timeoutId: NodeJS.Timeout;
      const installResources = async (): Promise<void> => {
        const { logger, isWriteEnabled } = this.options;
        if (!isWriteEnabled) {
          logger.info(`Write is disabled; not installing ${resources}`);
          return;
        }

        logger.info(`Installing ${resources}`);
        await installer();
        logger.info(`Installed ${resources}`);

        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };

      const throwTimeoutException = (): Promise<void> => {
        return new Promise((resolve, reject) => {
          timeoutId = setTimeout(() => {
            const msg = `Timeout: it took more than ${INSTALLATION_TIMEOUT}ms`;
            reject(new Error(msg));
          }, INSTALLATION_TIMEOUT);

          firstValueFrom(this.options.pluginStop$).then(() => {
            clearTimeout(timeoutId);
            const msg = 'Server is stopping; must stop all async operations';
            reject(new Error(msg));
          });
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
      const { logger, areFrameworkAlertsEnabled } = this.options;

      try {
        // We can install them in parallel
        await Promise.all([
          // Install ILM policy only if framework alerts are not enabled
          // If framework alerts are enabled, the alerting framework will install this ILM policy
          ...(areFrameworkAlertsEnabled
            ? []
            : [
                this.createOrUpdateLifecyclePolicy({
                  name: DEFAULT_ALERTS_ILM_POLICY_NAME,
                  body: DEFAULT_ALERTS_ILM_POLICY,
                }),
                this.createOrUpdateComponentTemplate({
                  name: ECS_COMPONENT_TEMPLATE_NAME,
                  body: ecsComponentTemplate,
                }),
              ]),
          this.createOrUpdateComponentTemplate({
            name: TECHNICAL_COMPONENT_TEMPLATE_NAME,
            body: technicalComponentTemplate,
          }),
        ]);
      } catch (err) {
        logger.error(
          `Error installing common resources in RuleRegistry ResourceInstaller - ${err.message}`
        );
        throw err;
      }
    });
  }

  // -----------------------------------------------------------------------------------------------
  // Index-level resources

  /**
   * Installs index-level resources shared between all namespaces of this index:
   *   - custom ILM policy if it was provided
   *   - component templates
   */
  public async installIndexLevelResources(indexInfo: IndexInfo): Promise<void> {
    await this.installWithTimeout(`resources for index ${indexInfo.baseName}`, async () => {
      const { componentTemplates, ilmPolicy } = indexInfo.indexOptions;
      if (ilmPolicy != null) {
        await this.createOrUpdateLifecyclePolicy({
          name: indexInfo.getIlmPolicyName(),
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
              _meta: ct._meta,
            },
          });
        })
      );
    });
  }

  private async updateIndexMappings(indexInfo: IndexInfo, namespace: string) {
    const { logger } = this.options;

    const aliases = indexInfo.basePattern;
    const backingIndices = indexInfo.getPatternForBackingIndices(namespace);

    logger.debug(`Updating mappings of existing concrete indices for ${indexInfo.baseName}`);

    // Find all concrete indices for all namespaces of the index.
    const concreteIndices = await this.fetchConcreteIndices(aliases, backingIndices);
    // Update total field limit setting of found indices
    await Promise.all(concreteIndices.map((item) => this.updateTotalFieldLimitSetting(item)));
    // Update mappings of the found indices.
    await Promise.all(concreteIndices.map((item) => this.updateAliasWriteIndexMapping(item)));
  }

  private async updateTotalFieldLimitSetting({ index, alias }: ConcreteIndexInfo) {
    const { logger, getClusterClient } = this.options;
    const clusterClient = await getClusterClient();

    try {
      await clusterClient.indices.putSettings({
        index,
        body: {
          'index.mapping.total_fields.limit': TOTAL_FIELDS_LIMIT,
        },
      });
      return;
    } catch (err) {
      logger.error(
        `Failed to PUT index.mapping.total_fields.limit settings for alias ${alias}: ${err.message}`
      );
      throw err;
    }
  }

  // NOTE / IMPORTANT: Please note this will update the mappings of backing indices but
  // *not* the settings. This is due to the fact settings can be classed as dynamic and static,
  // and static updates will fail on an index that isn't closed. New settings *will* be applied as part
  // of the ILM policy rollovers. More info: https://github.com/elastic/kibana/pull/113389#issuecomment-940152654
  private async updateAliasWriteIndexMapping({ index, alias }: ConcreteIndexInfo) {
    const { logger, getClusterClient } = this.options;
    const clusterClient = await getClusterClient();

    let simulatedIndexMapping: estypes.IndicesSimulateIndexTemplateResponse;
    try {
      simulatedIndexMapping = await clusterClient.indices.simulateIndexTemplate({
        name: index,
      });
    } catch (err) {
      logger.error(
        `Ignored PUT mappings for alias ${alias}; error generating simulated mappings: ${err.message}`
      );
      return;
    }

    const simulatedMapping = get(simulatedIndexMapping, ['template', 'mappings']);

    if (simulatedMapping == null) {
      logger.error(`Ignored PUT mappings for alias ${alias}; simulated mappings were empty`);
      return;
    }

    try {
      await clusterClient.indices.putMapping({
        index,
        body: simulatedMapping,
      });
      return;
    } catch (err) {
      logger.error(`Failed to PUT mapping for alias ${alias}: ${err.message}`);
      throw err;
    }
  }

  // -----------------------------------------------------------------------------------------------
  // Namespace-level resources

  /**
   * Installs and updates resources tied to concrete namespace of an index:
   *   - namespaced index template
   *   - Index mappings for existing concrete indices
   *   - concrete index (write target) if it doesn't exist
   */
  public async installAndUpdateNamespaceLevelResources(
    indexInfo: IndexInfo,
    namespace: string
  ): Promise<void> {
    const { logger } = this.options;

    const alias = indexInfo.getPrimaryAlias(namespace);

    logger.info(`Installing namespace-level resources and creating concrete index for ${alias}`);

    // Install / update the index template
    await this.installNamespacedIndexTemplate(indexInfo, namespace);
    // Update index mappings for indices matching this namespace.
    await this.updateIndexMappings(indexInfo, namespace);

    // If we find a concrete backing index which is the write index for the alias here, we shouldn't
    // be making a new concrete index. We return early because we don't need a new write target.
    const indexExists = await this.checkIfConcreteWriteIndexExists(indexInfo, namespace);
    if (indexExists) {
      return;
    } else {
      await this.createConcreteWriteIndex(indexInfo, namespace);
    }
  }

  private async checkIfConcreteWriteIndexExists(
    indexInfo: IndexInfo,
    namespace: string
  ): Promise<boolean> {
    const { logger } = this.options;

    const primaryNamespacedAlias = indexInfo.getPrimaryAlias(namespace);
    const indexPatternForBackingIndices = indexInfo.getPatternForBackingIndices(namespace);

    logger.debug(`Checking if concrete write index exists for ${primaryNamespacedAlias}`);

    const concreteIndices = await this.fetchConcreteIndices(
      primaryNamespacedAlias,
      indexPatternForBackingIndices
    );
    const concreteIndicesExist = concreteIndices.some(
      (item) => item.alias === primaryNamespacedAlias
    );
    const concreteWriteIndicesExist = concreteIndices.some(
      (item) => item.alias === primaryNamespacedAlias && item.isWriteIndex
    );

    // If we find backing indices for the alias here, we shouldn't be making a new concrete index -
    // either one of the indices is the write index so we return early because we don't need a new write target,
    // or none of them are the write index so we'll throw an error because one of the existing indices should have
    // been the write target

    // If there are some concrete indices but none of them are the write index, we'll throw an error
    // because one of the existing indices should have been the write target.
    if (concreteIndicesExist && !concreteWriteIndicesExist) {
      throw new Error(
        `Indices matching pattern ${indexPatternForBackingIndices} exist but none are set as the write index for alias ${primaryNamespacedAlias}`
      );
    }

    return concreteWriteIndicesExist;
  }

  private async installNamespacedIndexTemplate(indexInfo: IndexInfo, namespace: string) {
    const { logger } = this.options;
    const {
      componentTemplateRefs,
      componentTemplates,
      indexTemplate = {},
      ilmPolicy,
    } = indexInfo.indexOptions;

    const primaryNamespacedAlias = indexInfo.getPrimaryAlias(namespace);
    const secondaryNamespacedAlias = indexInfo.getSecondaryAlias(namespace);
    const indexPatternForBackingIndices = indexInfo.getPatternForBackingIndices(namespace);

    logger.debug(`Installing index template for ${primaryNamespacedAlias}`);

    const technicalComponentNames = [TECHNICAL_COMPONENT_TEMPLATE_NAME];
    const ownComponentNames = componentTemplates.map((template) =>
      indexInfo.getComponentTemplateName(template.name)
    );
    const ilmPolicyName = ilmPolicy ? indexInfo.getIlmPolicyName() : DEFAULT_ALERTS_ILM_POLICY_NAME;

    const indexMetadata: estypes.Metadata = {
      ...indexTemplate._meta,
      kibana: {
        ...indexTemplate._meta?.kibana,
        version: indexInfo.kibanaVersion,
      },
      namespace,
    };

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
        index_patterns: [indexPatternForBackingIndices],

        // Order matters:
        // - first go external component templates referenced by this index (e.g. the common full ECS template)
        // - then we include own component templates registered with this index
        // - finally, we include technical component templates to make sure the index gets all the
        //   mappings and settings required by all Kibana plugins using rule registry to work properly
        composed_of: [...componentTemplateRefs, ...ownComponentNames, ...technicalComponentNames],

        template: {
          settings: {
            hidden: true,
            'index.lifecycle': {
              name: ilmPolicyName,
              rollover_alias: primaryNamespacedAlias,
            },
            'index.mapping.total_fields.limit': TOTAL_FIELDS_LIMIT,
            auto_expand_replicas: '0-1',
          },
          mappings: {
            dynamic: false,
            _meta: indexMetadata,
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

        _meta: indexMetadata,

        // By setting the priority to namespace.length, we ensure that if one namespace is a prefix of another namespace
        // then newly created indices will use the matching template with the *longest* namespace
        priority: namespace.length,
      },
    });
  }

  private async createConcreteWriteIndex(indexInfo: IndexInfo, namespace: string) {
    const { logger, getClusterClient } = this.options;
    const clusterClient = await getClusterClient();

    const primaryNamespacedAlias = indexInfo.getPrimaryAlias(namespace);
    const initialIndexName = indexInfo.getConcreteIndexInitialName(namespace);

    logger.debug(`Creating concrete write index for ${primaryNamespacedAlias}`);

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
      logger.error(
        `Error creating index ${initialIndexName} as the write index for alias ${primaryNamespacedAlias} in RuleRegistry ResourceInstaller: ${err.message}`
      );
      // If the index already exists and it's the write index for the alias,
      // something else created it so suppress the error. If it's not the write
      // index, that's bad, throw an error.
      if (err?.meta?.body?.error?.type === 'resource_already_exists_exception') {
        const existingIndices = await clusterClient.indices.get({
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

  // -----------------------------------------------------------------------------------------------
  // Helpers

  private async createOrUpdateLifecyclePolicy(policy: estypes.IlmPutLifecycleRequest) {
    const { logger, getClusterClient } = this.options;
    const clusterClient = await getClusterClient();

    logger.debug(`Installing lifecycle policy ${policy.name}`);
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

    const simulateResponse = await clusterClient.indices.simulateTemplate(template);
    const mappings: estypes.MappingTypeMapping = simulateResponse.template.mappings;

    if (isEmpty(mappings)) {
      throw new Error(
        'No mappings would be generated for this index, possibly due to failed/misconfigured bootstrapping'
      );
    }

    return clusterClient.indices.putIndexTemplate(template);
  }

  private async fetchConcreteIndices(
    aliasOrPatternForAliases: string,
    indexPatternForBackingIndices: string
  ): Promise<ConcreteIndexInfo[]> {
    const { logger, getClusterClient } = this.options;
    const clusterClient = await getClusterClient();

    logger.debug(`Fetching concrete indices for ${indexPatternForBackingIndices}`);

    try {
      // It's critical that we specify *both* the index pattern for backing indices and their alias(es) in this request.
      // The alias prevents the request from finding other namespaces that could match the -* part of the index pattern
      // (see https://github.com/elastic/kibana/issues/107704). The backing index pattern prevents the request from
      // finding legacy .siem-signals indices that we add the alias to for backwards compatibility reasons. Together,
      // the index pattern and alias should ensure that we retrieve only the "new" backing indices for this
      // particular alias.
      const response = await clusterClient.indices.getAlias({
        index: indexPatternForBackingIndices,
        name: aliasOrPatternForAliases,
      });

      return createConcreteIndexInfo(response);
    } catch (err) {
      // 404 is expected if the alerts-as-data indices haven't been created yet
      if (err.statusCode === 404) {
        return createConcreteIndexInfo({});
      }

      logger.error(
        `Error fetching concrete indices for ${indexPatternForBackingIndices} in RuleRegistry ResourceInstaller - ${err.message}`
      );
      // A non-404 error is a real problem so we re-throw.
      throw err;
    }
  }
}

interface ConcreteIndexInfo {
  index: string;
  alias: string;
  isWriteIndex: boolean;
}

const createConcreteIndexInfo = (
  response: estypes.IndicesGetAliasResponse
): ConcreteIndexInfo[] => {
  return Object.entries(response).flatMap(([index, { aliases }]) =>
    Object.entries(aliases).map(([aliasName, aliasProperties]) => ({
      index,
      alias: aliasName,
      isWriteIndex: aliasProperties.is_write_index ?? false,
    }))
  );
};
