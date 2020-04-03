/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { CoreSetup, Plugin } from 'src/core/public';

import { PLUGIN_ID } from '../common/constants';
import { documentationService, uiMetricService, apiService } from './application/services';
import { Dependencies } from './types';

export class IngestPipelinesPlugin implements Plugin {
  public setup(coreSetup: CoreSetup, plugins: Dependencies): void {
    const { management, usageCollection } = plugins;
    const { http, getStartServices } = coreSetup;

    // Initialize services
    apiService.setup(http);
    uiMetricService.setup(usageCollection);

    management.sections.getSection('elasticsearch')!.registerApp({
      id: PLUGIN_ID,
      title: i18n.translate('xpack.ingestPipelines.appTitle', {
        defaultMessage: 'Ingest Pipelines',
      }),
      mount: async ({ element, setBreadcrumbs }) => {
        const [coreStart] = await getStartServices();
        const {
          docLinks,
          i18n: { Context: I18nContext },
        } = coreStart;

        documentationService.setup(docLinks);

        setBreadcrumbs([
          {
            text: i18n.translate('xpack.ingestPipelines.breadcrumbsTitle', {
              defaultMessage: 'Ingest Pipelines',
            }),
          },
        ]);

        const services = {
          setBreadcrumbs,
          metric: uiMetricService,
          documentation: documentationService,
          api: apiService,
        };

        const { renderApp } = await import('./application');
        return renderApp(element, I18nContext, services);
      },
    });
  }

  public start() {}

  public stop() {}
}
