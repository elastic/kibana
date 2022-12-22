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
import { IRuleTypeAlerts } from '../types';

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
   * Initializes all the ES resources used by the alerts client
   * - ILM policy
   * - Component templates
   * - Index templates
   * - Concrete write index
   *
   * Not using data streams because those are meant for append-only data
   * and we expect to mutate these documents
   */
  initialize(timeoutMs?: number): Promise<void>;
  initializeRegistrationContext(opts: IRuleTypeAlerts, timeoutMs?: number): Promise<void>;
  isInitialized(): boolean;
}

export class AlertsService implements IAlertsService {
  private initialized: boolean;
  private registrationContexts: Map<string, FieldMap> = new Map();

  constructor(private readonly options: AlertsServiceParams) {
    this.initialized = false;
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public async initialize(timeoutMs?: number) {
    // Only initialize once
    if (this.initialized) return;

    this.options.logger.debug(`Initializing resources for AlertsService`);

    const esClient = await this.options.elasticsearchClientPromise;

    const initFns = [
      () => this.createOrUpdateIlmPolicy(esClient),
      () => this.createOrUpdateComponentTemplate(esClient, getComponentTemplate(alertFieldMap)),
    ];

    for (let i = 0; i < initFns.length; ++i) {
      await this.installWithTimeout(async () => await initFns[i](), timeoutMs);
    }

    this.initialized = true;
  }

  public async initializeRegistrationContext(
    { registrationContext, fieldMap }: IRuleTypeAlerts,
    timeoutMs?: number
  ) {
    // check that this registration context has not been registered before
    if (this.registrationContexts.has(registrationContext)) {
      const registeredFieldMap = this.registrationContexts.get(registrationContext);
      if (!isEqual(fieldMap, registeredFieldMap)) {
        throw new Error(
          `${registrationContext} has already been registered with a different mapping`
        );
      }
      this.options.logger.info(
        `Resources for registration context "${registrationContext}" have already been installed.`
      );
      return;
    }
    this.options.logger.debug(
      `Initializing resources for registrationContext ${registrationContext}`
    );
    const esClient = await this.options.elasticsearchClientPromise;
    const indexTemplateAndPattern = getIndexTemplateAndPattern(registrationContext);

    const initFns = [
      async () =>
        await this.createOrUpdateComponentTemplate(
          esClient,
          getComponentTemplate(fieldMap, registrationContext)
        ),
      async () =>
        await this.createOrUpdateIndexTemplate(esClient, indexTemplateAndPattern, [
          getComponentTemplateName(),
          getComponentTemplateName(registrationContext),
        ]),
      async () => await this.createConcreteWriteIndex(esClient, indexTemplateAndPattern),
    ];

    for (let i = 0; i < initFns.length; ++i) {
      await this.installWithTimeout(async () => await initFns[i](), timeoutMs);
    }

    this.registrationContexts.set(registrationContext, fieldMap);
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
    this.options.logger.info(`Updating underlying mappings for ${concreteIndices.length} indices.`);

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
    this.options.logger.info(`Creating concrete write index`);

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

      this.options.logger.info(
        `Found ${concreteIndices.length} concrete indices - ${JSON.stringify(concreteIndices)}`
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
        return new Promise((resolve, reject) => {
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
