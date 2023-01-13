/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ClusterPutComponentTemplateRequest,
  IndicesSimulateIndexTemplateResponse,
  MappingTypeMapping,
} from '@elastic/elasticsearch/lib/api/types';
import { get, isEmpty, isEqual } from 'lodash';
import { Logger, ElasticsearchClient } from '@kbn/core/server';
import { firstValueFrom, Observable } from 'rxjs';
import { FieldMap } from '../../common/alert_schema/field_maps/types';
import { alertFieldMap } from '../../common/alert_schema';
import { ILM_POLICY_NAME, DEFAULT_ILM_POLICY } from './default_lifecycle_policy';
import {
  getComponentTemplate,
  getComponentTemplateName,
  getIndexTemplateAndPattern,
  IIndexPatternString,
} from './types';
import { retryTransientEsErrors } from './retry_transient_es_errors';
import { UntypedNormalizedRuleType } from '../rule_type_registry';
import { IRuleTypeAlerts } from '../types';
import {
  createResourceInstallationHelper,
  ResourceInstallationHelper,
} from './create_resource_installation_helper';
import { AlertsClient } from '../alerts_client/alerts_client';

const TOTAL_FIELDS_LIMIT = 2500;
const INSTALLATION_TIMEOUT = 20 * 60 * 1000; // 20 minutes

interface AlertsServiceParams {
  logger: Logger;
  pluginStop$: Observable<void>;
  elasticsearchClientPromise: Promise<ElasticsearchClient>;
}

interface ConcreteIndexInfo {
  index: string;
  alias: string;
  isWriteIndex: boolean;
}
interface IAlertsService {
  /**
   * Initializes the common ES resources needed for framework alerts as data
   * - ILM policy - common policy shared by all AAD indices
   * - Component template - common mappings for fields populated and used by the framework
   *
   * Once common resource initialization is complete, look for any solution-specific
   * resources that have been registered and are awaiting initialization.
   */
  initialize(timeoutMs?: number): void;

  /**
   * Register solution specific resources. If common resource initialization is
   * complete, go ahead and install those resources, otherwise add to queue to
   * await initialization
   *
   * Solution specific resources include:
   * - Component template - solution specific mappings for fields used only by solution rule types
   * - Index templates - solution specific template that combines common and solution specific component templates
   * - Concrete write index - solution specific write index
   */
  register(opts: IRuleTypeAlerts, timeoutMs?: number): void;

  isInitialized(): boolean;

  /**
   * If the rule type has registered an alert context, initialize and return an AlertsClient,
   * otherwise return null. Currently registering an alert context is optional but in the future
   * we will make it a requirement for all rule types and this function should not return null.
   */
  createAlertsClient(ruleType: UntypedNormalizedRuleType, maxAlerts: number): AlertsClient | null;
}

export class AlertsService implements IAlertsService {
  private initialized: boolean;
  private resourceInitializationHelper: ResourceInstallationHelper;
  private registeredContexts: Map<string, FieldMap> = new Map();

  constructor(private readonly options: AlertsServiceParams) {
    this.initialized = false;
    this.resourceInitializationHelper = createResourceInstallationHelper(
      this.initializeContext.bind(this)
    );
  }

  public isInitialized() {
    return this.initialized;
  }

  public async isContextInitialized(context: string): Promise<boolean> {
    return (await this.resourceInitializationHelper.getInitializedContexts().get(context)) ?? false;
  }

  public initialize(timeoutMs?: number) {
    // Only initialize once
    if (this.initialized) return;

    this.options.logger.debug(`Initializing resources for AlertsService`);

    // Use setImmediate to execute async fns as soon as possible
    setImmediate(async () => {
      try {
        const esClient = await this.options.elasticsearchClientPromise;

        // Common initialization installs ILM policy and shared component template
        const initFns = [
          () => this.createOrUpdateIlmPolicy(esClient),
          () => this.createOrUpdateComponentTemplate(esClient, getComponentTemplate(alertFieldMap)),
        ];

        for (const fn of initFns) {
          await this.installWithTimeout(async () => await fn(), timeoutMs);
        }

        this.initialized = true;
      } catch (err) {
        this.options.logger.error(
          `Error installing common resources for AlertsService. No additional resources will be installed and rule execution may be impacted.`
        );
        this.initialized = false;
      }

      if (this.initialized) {
        this.resourceInitializationHelper.setReadyToInitialize(timeoutMs);
      }
    });
  }

  public register({ context, fieldMap }: IRuleTypeAlerts, timeoutMs?: number) {
    // check whether this context has been registered before
    if (this.registeredContexts.has(context)) {
      const registeredFieldMap = this.registeredContexts.get(context);
      if (!isEqual(fieldMap, registeredFieldMap)) {
        throw new Error(`${context} has already been registered with a different mapping`);
      }
      this.options.logger.debug(`Resources for context "${context}" have already been registered.`);
      return;
    }

    this.options.logger.info(`Registering resources for context "${context}".`);
    this.registeredContexts.set(context, fieldMap);
    this.resourceInitializationHelper.add({ context, fieldMap }, timeoutMs);
  }

  public createAlertsClient(ruleType: UntypedNormalizedRuleType, maxAlerts: number) {
    // TODO - if context specific installation has failed during plugin setup,
    // we want to retry it here but we probably only want to do N retries before just logging an error.
    return this.initialized && ruleType.alerts
      ? new AlertsClient({
          logger: this.options.logger,
          elasticsearchClientPromise: this.options.elasticsearchClientPromise,
          resourceInstallationPromise: this.isContextInitialized(ruleType.alerts.context),
          ruleType,
          maxAlerts,
        })
      : null;
  }

  private async initializeContext({ context, fieldMap }: IRuleTypeAlerts, timeoutMs?: number) {
    const esClient = await this.options.elasticsearchClientPromise;

    const indexTemplateAndPattern = getIndexTemplateAndPattern(context);

    // Context specific initialization installs component template, index template and write index
    // If fieldMap is empty, don't create context specific component template
    const initFns = isEmpty(fieldMap)
      ? [
          async () =>
            await this.createOrUpdateIndexTemplate(esClient, indexTemplateAndPattern, [
              getComponentTemplateName(),
            ]),
          async () => await this.createConcreteWriteIndex(esClient, indexTemplateAndPattern),
        ]
      : [
          async () =>
            await this.createOrUpdateComponentTemplate(
              esClient,
              getComponentTemplate(fieldMap, context)
            ),
          async () =>
            await this.createOrUpdateIndexTemplate(esClient, indexTemplateAndPattern, [
              getComponentTemplateName(),
              getComponentTemplateName(context),
            ]),
          async () => await this.createConcreteWriteIndex(esClient, indexTemplateAndPattern),
        ];

    for (const fn of initFns) {
      await this.installWithTimeout(async () => await fn(), timeoutMs);
    }
  }

  /**
   * Creates ILM policy if it doesn't already exist, updates it if it does
   */
  private async createOrUpdateIlmPolicy(esClient: ElasticsearchClient) {
    this.options.logger.info(`Installing ILM policy ${ILM_POLICY_NAME}`);

    try {
      await retryTransientEsErrors(
        () =>
          esClient.ilm.putLifecycle({
            name: ILM_POLICY_NAME,
            body: DEFAULT_ILM_POLICY,
          }),
        { logger: this.options.logger }
      );
    } catch (err) {
      this.options.logger.error(`Error installing ILM policy ${ILM_POLICY_NAME} - ${err.message}`);
      throw err;
    }
  }

  private async createOrUpdateComponentTemplate(
    esClient: ElasticsearchClient,
    template: ClusterPutComponentTemplateRequest
  ) {
    this.options.logger.info(`Installing component template ${template.name}`);

    try {
      await retryTransientEsErrors(() => esClient.cluster.putComponentTemplate(template), {
        logger: this.options.logger,
      });
    } catch (err) {
      this.options.logger.error(
        `Error installing component template ${template.name} - ${err.message}`
      );
      throw err;
    }
  }

  /**
   * Installs index template that uses installed component template
   * Prior to installation, simulates the installation to check for possible
   * conflicts. Simulate should return an empty mapping if a template
   * conflicts with an already installed template.
   */
  private async createOrUpdateIndexTemplate(
    esClient: ElasticsearchClient,
    indexPatterns: IIndexPatternString,
    componentTemplateNames: string[]
  ) {
    this.options.logger.info(`Installing index template ${indexPatterns.template}`);

    const indexTemplate = {
      name: indexPatterns.template,
      body: {
        index_patterns: [indexPatterns.pattern],
        composed_of: componentTemplateNames,
        template: {
          settings: {
            auto_expand_replicas: '0-1',
            hidden: true,
            'index.lifecycle': {
              name: ILM_POLICY_NAME,
              rollover_alias: indexPatterns.alias,
            },
            'index.mapping.total_fields.limit': TOTAL_FIELDS_LIMIT,
          },
          mappings: {
            dynamic: false,
          },
        },
        _meta: {
          managed: true,
        },
        // do we need metadata? like kibana version? doesn't that get updated every version? or just the first version its installed
      },
    };

    let mappings: MappingTypeMapping = {};
    try {
      // Simulate the index template to proactively identify any issues with the mapping
      const simulateResponse = await esClient.indices.simulateTemplate(indexTemplate);
      mappings = simulateResponse.template.mappings;
    } catch (err) {
      this.options.logger.error(
        `Failed to simulate index template mappings for ${indexPatterns.template}; not applying mappings - ${err.message}`
      );
      return;
    }

    if (isEmpty(mappings)) {
      throw new Error(
        `No mappings would be generated for ${indexPatterns.template}, possibly due to failed/misconfigured bootstrapping`
      );
    }

    try {
      await retryTransientEsErrors(() => esClient.indices.putIndexTemplate(indexTemplate), {
        logger: this.options.logger,
      });
    } catch (err) {
      this.options.logger.error(
        `Error installing index template ${indexPatterns.template} - ${err.message}`
      );
      throw err;
    }
  }

  /**
   * Updates the underlying mapping for any existing concrete indices
   */
  private async updateIndexMappings(
    esClient: ElasticsearchClient,
    concreteIndices: ConcreteIndexInfo[]
  ) {
    this.options.logger.debug(
      `Updating underlying mappings for ${concreteIndices.length} indices.`
    );

    // Update total field limit setting of found indices
    // Other index setting changes are not updated at this time
    await Promise.all(
      concreteIndices.map((index) => this.updateTotalFieldLimitSetting(esClient, index))
    );

    // Update mappings of the found indices.
    await Promise.all(
      concreteIndices.map((index) => this.updateUnderlyingMapping(esClient, index))
    );
  }

  private async updateTotalFieldLimitSetting(
    esClient: ElasticsearchClient,
    { index, alias }: ConcreteIndexInfo
  ) {
    try {
      await retryTransientEsErrors(
        () =>
          esClient.indices.putSettings({
            index,
            body: {
              'index.mapping.total_fields.limit': TOTAL_FIELDS_LIMIT,
            },
          }),
        {
          logger: this.options.logger,
        }
      );
      return;
    } catch (err) {
      this.options.logger.error(
        `Failed to PUT index.mapping.total_fields.limit settings for alias ${alias}: ${err.message}`
      );
      throw err;
    }
  }

  private async updateUnderlyingMapping(
    esClient: ElasticsearchClient,
    { index, alias }: ConcreteIndexInfo
  ) {
    let simulatedIndexMapping: IndicesSimulateIndexTemplateResponse;
    try {
      simulatedIndexMapping = await esClient.indices.simulateIndexTemplate({
        name: index,
      });
    } catch (err) {
      this.options.logger.error(
        `Ignored PUT mappings for alias ${alias}; error generating simulated mappings: ${err.message}`
      );
      return;
    }

    const simulatedMapping = get(simulatedIndexMapping, ['template', 'mappings']);

    if (simulatedMapping == null) {
      this.options.logger.error(
        `Ignored PUT mappings for alias ${alias}; simulated mappings were empty`
      );
      return;
    }

    try {
      await retryTransientEsErrors(
        () =>
          esClient.indices.putMapping({
            index,
            body: simulatedMapping,
          }),
        {
          logger: this.options.logger,
        }
      );

      return;
    } catch (err) {
      this.options.logger.error(`Failed to PUT mapping for alias ${alias}: ${err.message}`);
      throw err;
    }
  }

  private async createConcreteWriteIndex(
    esClient: ElasticsearchClient,
    indexPatterns: IIndexPatternString
  ) {
    this.options.logger.info(`Creating concrete write index - ${indexPatterns.name}`);

    // check if a concrete write index already exists
    let concreteIndices: ConcreteIndexInfo[] = [];
    try {
      const response = await esClient.indices.getAlias({
        index: indexPatterns.pattern,
      });

      concreteIndices = Object.entries(response).flatMap(([index, { aliases }]) =>
        Object.entries(aliases).map(([aliasName, aliasProperties]) => ({
          index,
          alias: aliasName,
          isWriteIndex: aliasProperties.is_write_index ?? false,
        }))
      );

      this.options.logger.debug(
        `Found ${concreteIndices.length} concrete indices for ${
          indexPatterns.name
        } - ${JSON.stringify(concreteIndices)}`
      );
    } catch (error) {
      // 404 is expected if no concrete write indices have been created
      if (error.statusCode !== 404) {
        this.options.logger.error(
          `Error fetching concrete indices for ${indexPatterns.pattern} pattern - ${error.message}`
        );
        throw error;
      }
    }

    let concreteWriteIndicesExist = false;
    // if a concrete write index already exists, update the underlying mapping
    if (concreteIndices.length > 0) {
      await this.updateIndexMappings(esClient, concreteIndices);

      const concreteIndicesExist = concreteIndices.some(
        (index) => index.alias === indexPatterns.alias
      );
      concreteWriteIndicesExist = concreteIndices.some(
        (index) => index.alias === indexPatterns.alias && index.isWriteIndex
      );

      // If there are some concrete indices but none of them are the write index, we'll throw an error
      // because one of the existing indices should have been the write target.
      if (concreteIndicesExist && !concreteWriteIndicesExist) {
        throw new Error(
          `Indices matching pattern ${indexPatterns.pattern} exist but none are set as the write index for alias ${indexPatterns.alias}`
        );
      }
    }

    // check if a concrete write index already exists
    if (!concreteWriteIndicesExist) {
      try {
        await retryTransientEsErrors(
          () =>
            esClient.indices.create({
              index: indexPatterns.name,
              body: {
                aliases: {
                  [indexPatterns.alias]: {
                    is_write_index: true,
                  },
                },
              },
            }),
          {
            logger: this.options.logger,
          }
        );
      } catch (error) {
        this.options.logger.error(`Error creating concrete write index - ${error.message}`);
        // If the index already exists and it's the write index for the alias,
        // something else created it so suppress the error. If it's not the write
        // index, that's bad, throw an error.
        if (error?.meta?.body?.error?.type === 'resource_already_exists_exception') {
          const existingIndices = await esClient.indices.get({
            index: indexPatterns.name,
          });
          if (
            !existingIndices[indexPatterns.name]?.aliases?.[indexPatterns.alias]?.is_write_index
          ) {
            throw Error(
              `Attempted to create index: ${indexPatterns.name} as the write index for alias: ${indexPatterns.alias}, but the index already exists and is not the write index for the alias`
            );
          }
        } else {
          throw error;
        }
      }
    }
  }

  private async installWithTimeout(
    installFn: () => Promise<void>,
    timeoutMs: number = INSTALLATION_TIMEOUT
  ): Promise<void> {
    try {
      let timeoutId: NodeJS.Timeout;
      const install = async (): Promise<void> => {
        await installFn();
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };

      const throwTimeoutException = (): Promise<void> => {
        return new Promise((_, reject) => {
          timeoutId = setTimeout(() => {
            const msg = `Timeout: it took more than ${timeoutMs}ms`;
            reject(new Error(msg));
          }, timeoutMs);

          firstValueFrom(this.options.pluginStop$).then(() => {
            clearTimeout(timeoutId);
            const msg = 'Server is stopping; must stop all async operations';
            reject(new Error(msg));
          });
        });
      };

      await Promise.race([install(), throwTimeoutException()]);
    } catch (e) {
      this.options.logger.error(e);

      if (e?.message.indexOf('Server is stopping') < 0) {
        const reason = e?.message || 'Unknown reason';
        throw new Error(`Failure during installation. ${reason}`);
      }
    }
  }
}
