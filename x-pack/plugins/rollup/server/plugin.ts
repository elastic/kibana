/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import { first } from 'rxjs/operators';
import {
  CoreSetup,
  Plugin,
  Logger,
  PluginInitializerContext,
  SharedGlobalConfig,
} from 'src/core/server';
import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';

import { PLUGIN, CONFIG_ROLLUPS } from '../common';
import { Dependencies } from './types';
import { registerApiRoutes } from './routes';
import { License } from './services';
import { registerRollupUsageCollector } from './collectors';
import { rollupDataEnricher } from './rollup_data_enricher';
import { IndexPatternsFetcher } from './shared_imports';
import { handleEsError } from './shared_imports';
import { formatEsError } from './lib/format_es_error';
import { getCapabilitiesForRollupIndices } from '../../../../src/plugins/data/server';

export class RollupPlugin implements Plugin<void, void, any, any> {
  private readonly logger: Logger;
  private readonly globalConfig$: Observable<SharedGlobalConfig>;
  private readonly license: License;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.globalConfig$ = initializerContext.config.legacy.globalConfig$;
    this.license = new License();
  }

  public setup(
    { http, uiSettings, getStartServices }: CoreSetup,
    { features, licensing, indexManagement, visTypeTimeseries, usageCollection }: Dependencies
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

    features.registerElasticsearchFeature({
      id: 'rollup_jobs',
      management: {
        data: ['rollup_jobs'],
      },
      catalogue: ['rollup_jobs'],
      privileges: [
        {
          requiredClusterPrivileges: ['manage_rollup'],
          ui: [],
        },
      ],
    });

    registerApiRoutes({
      router: http.createRouter(),
      license: this.license,
      lib: {
        handleEsError,
        formatEsError,
        getCapabilitiesForRollupIndices,
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
              which in turn enable visualizations based on rollup data.`,
        }),
        category: ['rollups'],
        schema: schema.boolean(),
        requiresPageReload: true,
      },
    });

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

  stop() {}
}
