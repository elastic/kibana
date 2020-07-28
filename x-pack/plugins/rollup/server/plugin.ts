/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

declare module 'src/core/server' {
  interface RequestHandlerContext {
    rollup?: RollupContext;
  }
}

import { Observable } from 'rxjs';
import { first } from 'rxjs/operators';
import {
  CoreSetup,
  ILegacyCustomClusterClient,
  Plugin,
  Logger,
  KibanaRequest,
  PluginInitializerContext,
  ILegacyScopedClusterClient,
  LegacyAPICaller,
  SharedGlobalConfig,
} from 'src/core/server';
import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';

import { PLUGIN, CONFIG_ROLLUPS } from '../common';
import { Dependencies, CallWithRequestFactoryShim } from './types';
import { registerApiRoutes } from './routes';
import { License } from './services';
import { registerRollupUsageCollector } from './collectors';
import { rollupDataEnricher } from './rollup_data_enricher';
import { IndexPatternsFetcher } from './shared_imports';
import { registerRollupSearchStrategy } from './lib/search_strategies';
import { elasticsearchJsPlugin } from './client/elasticsearch_rollup';
import { isEsError } from './shared_imports';
import { formatEsError } from './lib/format_es_error';
import { getCapabilitiesForRollupIndices } from './lib/map_capabilities';
import { mergeCapabilitiesWithFields } from './lib/merge_capabilities_with_fields';

interface RollupContext {
  client: ILegacyScopedClusterClient;
}
async function getCustomEsClient(getStartServices: CoreSetup['getStartServices']) {
  const [core] = await getStartServices();
  // Extend the elasticsearchJs client with additional endpoints.
  const esClientConfig = { plugins: [elasticsearchJsPlugin] };
  return core.elasticsearch.legacy.createClient('rollup', esClientConfig);
}

export class RollupPlugin implements Plugin<void, void, any, any> {
  private readonly logger: Logger;
  private readonly globalConfig$: Observable<SharedGlobalConfig>;
  private readonly license: License;
  private rollupEsClient?: ILegacyCustomClusterClient;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.globalConfig$ = initializerContext.config.legacy.globalConfig$;
    this.license = new License();
  }

  public setup(
    { http, uiSettings, getStartServices }: CoreSetup,
    { licensing, indexManagement, visTypeTimeseries, usageCollection }: Dependencies
  ) {
    this.license.setup(
      {
        pluginId: PLUGIN.ID,
        minimumLicenseType: PLUGIN.minimumLicenseType,
        defaultErrorMessage: i18n.translate('xpack.rollupJobs.licenseCheckErrorMessage', {
          defaultMessage: 'License check failed',
        }),
      },
      {
        licensing,
        logger: this.logger,
      }
    );

    http.registerRouteHandlerContext('rollup', async (context, request) => {
      this.rollupEsClient = this.rollupEsClient ?? (await getCustomEsClient(getStartServices));
      return {
        client: this.rollupEsClient.asScoped(request),
      };
    });

    registerApiRoutes({
      router: http.createRouter(),
      license: this.license,
      lib: {
        isEsError,
        formatEsError,
        getCapabilitiesForRollupIndices,
        mergeCapabilitiesWithFields,
      },
      sharedImports: {
        IndexPatternsFetcher,
      },
    });

    uiSettings.register({
      [CONFIG_ROLLUPS]: {
        name: i18n.translate('xpack.rollupJobs.rollupIndexPatternsTitle', {
          defaultMessage: 'Enable rollup index patterns',
        }),
        value: true,
        description: i18n.translate('xpack.rollupJobs.rollupIndexPatternsDescription', {
          defaultMessage: `Enable the creation of index patterns which capture rollup indices,
              which in turn enable visualizations based on rollup data. Refresh
              the page to apply the changes.`,
        }),
        category: ['rollups'],
        schema: schema.boolean(),
      },
    });

    if (visTypeTimeseries) {
      // TODO: When vis_type_timeseries is fully migrated to the NP, it shouldn't require this shim.
      const callWithRequestFactoryShim = (
        elasticsearchServiceShim: CallWithRequestFactoryShim,
        request: KibanaRequest
      ): LegacyAPICaller => {
        return async (...args: Parameters<LegacyAPICaller>) => {
          this.rollupEsClient = this.rollupEsClient ?? (await getCustomEsClient(getStartServices));
          return await this.rollupEsClient.asScoped(request).callAsCurrentUser(...args);
        };
      };

      const { addSearchStrategy } = visTypeTimeseries;
      registerRollupSearchStrategy(callWithRequestFactoryShim, addSearchStrategy);
    }

    if (usageCollection) {
      this.globalConfig$
        .pipe(first())
        .toPromise()
        .then((globalConfig) => {
          registerRollupUsageCollector(usageCollection, globalConfig.kibana.index);
        })
        .catch((e: any) => {
          this.logger.warn(`Registering Rollup collector failed: ${e}`);
        });
    }

    if (indexManagement && indexManagement.indexDataEnricher) {
      indexManagement.indexDataEnricher.add(rollupDataEnricher);
    }
  }

  start() {}

  stop() {
    if (this.rollupEsClient) {
      this.rollupEsClient.close();
    }
  }
}
