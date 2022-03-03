/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from 'kibana/public';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';
import { ApmPluginStartDeps } from '../plugin';

interface UxKibanaServices extends ApmPluginStartDeps {
  http: CoreStart['http'];
  docLinks: CoreStart['docLinks'];
  uiSettings: CoreStart['uiSettings'];
  application: CoreStart['application'];
}

export function useKibanaServices() {
  return useKibana<UxKibanaServices>().services;
}
