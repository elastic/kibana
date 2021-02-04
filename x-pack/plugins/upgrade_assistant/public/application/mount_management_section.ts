/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from 'src/core/public';
import { ManagementAppMountParams } from '../../../../../src/plugins/management/public';
import { renderApp } from './render_app';
import { KibanaVersionContext } from './app_context';

export async function mountManagementSection(
  coreSetup: CoreSetup,
  isCloudEnabled: boolean,
  params: ManagementAppMountParams,
  kibanaVersionInfo: KibanaVersionContext
) {
  const [{ i18n, docLinks }] = await coreSetup.getStartServices();
  return renderApp({
    element: params.element,
    isCloudEnabled,
    http: coreSetup.http,
    i18n,
    docLinks,
    kibanaVersionInfo,
  });
}
