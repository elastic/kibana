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
import { alertFieldMap, ecsFieldMap, legacyAlertFieldMap } from '@kbn/alerts-as-data-utils';
import {
  IndicesGetIndexTemplateIndexTemplateItem,
  Metadata,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { asyncForEach } from '@kbn/std';
import {
  DEFAULT_ALERTS_ILM_POLICY_NAME,
  DEFAULT_ALERTS_ILM_POLICY,
} from './default_lifecycle_policy';
import {
  getComponentTemplate,
  getComponentTemplateName,
  getIndexTemplateAndPattern,
  IIndexPatternString,
} from './resource_installer_utils';
import { retryTransientEsErrors } from './retry_transient_es_errors';
import { IRuleTypeAlerts } from '../types';
import {
  createResourceInstallationHelper,
  errorResult,
  InitializationPromise,
  ResourceInstallationHelper,
  successResult,
} from './create_resource_installation_helper';

const TOTAL_FIELDS_LIMIT = 2500;
const INSTALLATION_TIMEOUT = 20 * 60 * 1000; // 20 minutes
const LEGACY_ALERT_CONTEXT = 'legacy-alert';
export const ECS_CONTEXT = `ecs`;
export const ECS_COMPONENT_TEMPLATE_NAME = getComponentTemplateName({ name: ECS_CONTEXT });
interface AlertsServiceParams {
  logger: Logger;
  pluginStop$: Observable<void>;
  kibanaVersion: string;
  elasticsearchClientPromise: Promise<ElasticsearchClient>;
  timeoutMs?: number;
}

interface ConcreteIndexInfo {
  index: string;
  alias: string;
  isWriteIndex: boolean;
}

interface IAlertsService {
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
   * Returns promise that resolves when the resources for the given
   * context are installed. These include the context specific component template,
   * the index template for the default namespace and the concrete write index
   * for the default namespace.
   */
  getContextInitializationPromise(context: string): Promise<InitializationPromise>;
}

export type PublicAlertsService = Pick<IAlertsService, 'getContextInitializationPromise'>;
export type PublicFrameworkAlertsService = PublicAlertsService & {
  enabled: () => boolean;
};

export class AlertsService implements IAlertsService {
  private initialized: boolean;
  private resourceInitializationHelper: ResourceInstallationHelper;
  private registeredContexts: Map<string, IRuleTypeAlerts> = new Map();
  private commonInitPromise: Promise<InitializationPromise>;

  constructor(private readonly options: AlertsServiceParams) {
    this.initialized = false;

    // Kick off initialization of common assets and save the promise
    this.commonInitPromise = this.initializeCommon(this.options.timeoutMs);

    // Create helper for initializing context-specific resources
    this.resourceInitializationHelper = createResourceInstallationHelper(
      this.options.logger,
      this.commonInitPromise,
      this.initializeContext.bind(this)
    );
  }

  public isInitialized() {
    return this.initialized;
  }

  public async getContextInitializationPromise(
    context: string,
    timeoutMs?: number
  ): Promise<InitializationPromise> {
    if (!this.registeredContexts.has(context)) {
      const errMsg = `Error getting initialized status for context ${context} - context has not been registered.`;
      this.options.logger.error(errMsg);
      return Promise.resolve(errorResult(errMsg));
    }
    return this.resourceInitializationHelper.getInitializedContext(context, timeoutMs);
  }

  public register(opts: IRuleTypeAlerts, timeoutMs?: number) {
    const { context } = opts;
    // check whether this context has been registered before
    if (this.registeredContexts.has(context)) {
      const registeredOptions = this.registeredContexts.get(context);
      if (!isEqual(opts, registeredOptions)) {
        throw new Error(`${context} has already been registered with different options`);
      }
      this.options.logger.debug(`Resources for context "${context}" have already been registered.`);
      return;
    }

    this.options.logger.info(`Registering resources for context "${context}".`);
    this.registeredContexts.set(context, opts);
    this.resourceInitializationHelper.add(opts, timeoutMs);
  }

  /**
   * Initializes the common ES resources needed for framework alerts as data
   * - ILM policy - common policy shared by all AAD indices
   * - Component template - common mappings for fields populated and used by the framework
   */
  private async initializeCommon(timeoutMs?: number): Promise<InitializationPromise> {
    try {
      this.options.logger.debug(`Initializing resources for AlertsService`);
      const esClient = await this.options.elasticsearchClientPromise;

      // Common initialization installs ILM policy and shared component template
      const initFns = [
        () => this.createOrUpdateIlmPolicy(esClient),
        () =>
          this.createOrUpdateComponentTemplate(
            esClient,
            getComponentTemplate({ fieldMap: alertFieldMap, includeSettings: true })
          ),
        () =>
          this.createOrUpdateComponentTemplate(
            esClient,
            getComponentTemplate({
              fieldMap: legacyAlertFieldMap,
              name: LEGACY_ALERT_CONTEXT,
              includeSettings: true,
            })
          ),
        () =>
          this.createOrUpdateComponentTemplate(
            esClient,
            getComponentTemplate({
              fieldMap: ecsFieldMap,
              name: ECS_CONTEXT,
              includeSettings: true,
            })
          ),
      ];

      for (const fn of initFns) {
        await this.installWithTimeout(async () => await fn(), timeoutMs);
      }

      this.initialized = true;
      return successResult();
    } catch (err) {
      this.options.logger.error(
        `Error installing common resources for AlertsService. No additional resources will be installed and rule execution may be impacted. - ${err.message}`
      );
      this.initialized = false;
      return errorResult(err.message);
    }
  }

  private async initializeContext(
    { context, mappings, useEcs, useLegacyAlerts, secondaryAlias }: IRuleTypeAlerts,
    timeoutMs?: number
  ) {
    const esClient = await this.options.elasticsearchClientPromise;

    const indexTemplateAndPattern = getIndexTemplateAndPattern({ context, secondaryAlias });

    let initFns: Array<() => Promise<void>> = [];

    // List of component templates to reference
    // Order matters in this list - templates specified last take precedence over those specified first
    // 1. ECS component template, if using
    // 2. Context specific component template, if defined during registration
    // 3. Legacy alert component template, if using
    // 4. Framework common component template, always included
    const componentTemplateRefs: string[] = [];

    // If useEcs is set to true, add the ECS component template to the references
    if (useEcs) {
      componentTemplateRefs.push(getComponentTemplateName({ name: ECS_CONTEXT }));
    }

    // If fieldMap is not empty, create a context specific component template and add to the references
    if (!isEmpty(mappings.fieldMap)) {
      const componentTemplate = getComponentTemplate({
        fieldMap: mappings.fieldMap,
        dynamic: mappings.dynamic,
        context,
      });
      initFns.push(
        async () => await this.createOrUpdateComponentTemplate(esClient, componentTemplate)
      );
      componentTemplateRefs.push(componentTemplate.name);
    }

    // If useLegacy is set to true, add the legacy alert component template to the references
    if (useLegacyAlerts) {
      componentTemplateRefs.push(getComponentTemplateName({ name: LEGACY_ALERT_CONTEXT }));
    }

    // Add framework component template to the references
    componentTemplateRefs.push(getComponentTemplateName());

    // Context specific initialization installs index template and write index
    initFns = initFns.concat([
      async () =>
        await this.createOrUpdateIndexTemplate(
          esClient,
          indexTemplateAndPattern,
          componentTemplateRefs
        ),
      async () => await this.createConcreteWriteIndex(esClient, indexTemplateAndPattern),
    ]);

    for (const fn of initFns) {
      await this.installWithTimeout(async () => await fn(), timeoutMs);
    }
  }

  /**
   * Creates ILM policy if it doesn't already exist, updates it if it does
   */
  private async createOrUpdateIlmPolicy(esClient: ElasticsearchClient) {
    this.options.logger.info(`Installing ILM policy ${DEFAULT_ALERTS_ILM_POLICY_NAME}`);

    try {
      await retryTransientEsErrors(
        () =>
          esClient.ilm.putLifecycle({
            name: DEFAULT_ALERTS_ILM_POLICY_NAME,
            body: DEFAULT_ALERTS_ILM_POLICY,
          }),
        { logger: this.options.logger }
      );
    } catch (err) {
      this.options.logger.error(
        `Error installing ILM policy ${DEFAULT_ALERTS_ILM_POLICY_NAME} - ${err.message}`
      );
      throw err;
    }
  }

  private async getIndexTemplatesUsingComponentTemplate(
    esClient: ElasticsearchClient,
    componentTemplateName: string
  ) {
    // Get all index templates and filter down to just the ones referencing this component template
    const { index_templates: indexTemplates } = await esClient.indices.getIndexTemplate();
    const indexTemplatesUsingComponentTemplate = (indexTemplates ?? []).filter(
      (indexTemplate: IndicesGetIndexTemplateIndexTemplateItem) =>
        indexTemplate.index_template.composed_of.includes(componentTemplateName)
    );
    await asyncForEach(
      indexTemplatesUsingComponentTemplate,
      async (template: IndicesGetIndexTemplateIndexTemplateItem) => {
        await esClient.indices.putIndexTemplate({
          name: template.name,
          body: {
            ...template.index_template,
            template: {
              ...template.index_template.template,
              settings: {
                ...template.index_template.template?.settings,
                'index.mapping.total_fields.limit': TOTAL_FIELDS_LIMIT,
              },
            },
          },
        });
      }
    );
  }

  private async createOrUpdateComponentTemplateHelper(
    esClient: ElasticsearchClient,
    template: ClusterPutComponentTemplateRequest
  ) {
    try {
      await esClient.cluster.putComponentTemplate(template);
    } catch (error) {
      const reason = error?.meta?.body?.error?.caused_by?.caused_by?.caused_by?.reason;
      if (reason && reason.match(/Limit of total fields \[\d+\] has been exceeded/) != null) {
        // This error message occurs when there is an index template using this component template
        // that contains a field limit setting that using this component template exceeds
        // Specifically, this can happen for the ECS component template when we add new fields
        // to adhere to the ECS spec. Individual index templates specify field limits so if the
        // number of new ECS fields pushes the composed mapping above the limit, this error will
        // occur. We have to update the field limit inside the index template now otherwise we
        // can never update the component template
        await this.getIndexTemplatesUsingComponentTemplate(esClient, template.name);

        // Try to update the component template again
        await esClient.cluster.putComponentTemplate(template);
      } else {
        throw error;
      }
    }
  }

  private async createOrUpdateComponentTemplate(
    esClient: ElasticsearchClient,
    template: ClusterPutComponentTemplateRequest
  ) {
    this.options.logger.info(`Installing component template ${template.name}`);

    try {
      await retryTransientEsErrors(
        () => this.createOrUpdateComponentTemplateHelper(esClient, template),
        {
          logger: this.options.logger,
        }
      );
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

    const indexMetadata: Metadata = {
      kibana: {
        version: this.options.kibanaVersion,
      },
      managed: true,
      namespace: 'default', // hard-coded to default here until we start supporting space IDs
    };

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
              name: DEFAULT_ALERTS_ILM_POLICY_NAME,
              rollover_alias: indexPatterns.alias,
            },
            'index.mapping.total_fields.limit': TOTAL_FIELDS_LIMIT,
          },
          mappings: {
            dynamic: false,
            _meta: indexMetadata,
          },
          ...(indexPatterns.secondaryAlias
            ? {
                aliases: {
                  [indexPatterns.secondaryAlias]: {
                    is_write_index: false,
                  },
                },
              }
            : {}),
        },
        _meta: indexMetadata,

        // TODO - set priority of this template when we start supporting spaces
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
      // Specify both the index pattern for the backing indices and their aliases
      // The alias prevents the request from finding other namespaces that could match the -* pattern
      const response = await esClient.indices.getAlias({
        index: indexPatterns.pattern,
        name: indexPatterns.basePattern,
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
            reject(new Error('Server is stopping; must stop all async operations'));
          });
        });
      };

      await Promise.race([install(), throwTimeoutException()]);
    } catch (e) {
      this.options.logger.error(e);

      const reason = e?.message || 'Unknown reason';
      throw new Error(`Failure during installation. ${reason}`);
    }
  }
}
