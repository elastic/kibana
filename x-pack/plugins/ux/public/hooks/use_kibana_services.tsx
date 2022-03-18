/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  HttpStart,
  DocLinksStart,
  IUiSettingsClient,
  ApplicationStart,
} from 'kibana/public';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';
import { ApmPluginStartDeps } from '../plugin';

interface UxKibanaServices extends ApmPluginStartDeps {
  http: HttpStart;
  docLinks: DocLinksStart;
  uiSettings: IUiSettingsClient;
  application: ApplicationStart;
}

export function useKibanaServices() {
  return useKibana<UxKibanaServices>().services;
}
