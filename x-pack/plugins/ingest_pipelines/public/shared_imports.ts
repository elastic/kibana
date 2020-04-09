/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { useKibana as _useKibana } from '../../../../src/plugins/kibana_react/public';
import { AppServices } from './application';

export {
  SendRequestConfig,
  SendRequestResponse,
  UseRequestConfig,
  sendRequest,
  useRequest,
} from '../../../../src/plugins/es_ui_shared/public/request/np_ready_request';

export { SectionLoading } from '../../../../src/plugins/es_ui_shared/public';

export const useKibana = () => _useKibana<AppServices>();
