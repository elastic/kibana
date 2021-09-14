/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana as _useKibana } from '../../../../src/plugins/kibana_react/public';
import { AppServicesContext } from './types';

export {
  sendRequest,
  SendRequestConfig,
  SendRequestResponse,
  useRequest,
  UseRequestConfig,
  SectionLoading,
  GlobalFlyout,
} from '../../../../src/plugins/es_ui_shared/public/';

export { KibanaContextProvider } from '../../../../src/plugins/kibana_react/public';

export { DataPublicPluginStart } from '../../../../src/plugins/data/public';

export const useKibana = () => _useKibana<AppServicesContext>();
