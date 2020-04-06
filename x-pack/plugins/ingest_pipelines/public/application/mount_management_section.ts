/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { CoreSetup } from 'src/core/public';
import { ManagementAppMountParams } from 'src/plugins/management/public';
import { i18n } from '@kbn/i18n';

import { documentationService, uiMetricService, apiService } from './services';
import { renderApp } from '.';

export async function mountManagementSection(
  coreSetup: CoreSetup,
  params: ManagementAppMountParams
) {
  const { element, setBreadcrumbs } = params;
  const [coreStart] = await coreSetup.getStartServices();
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

  return renderApp(element, I18nContext, services);
}
