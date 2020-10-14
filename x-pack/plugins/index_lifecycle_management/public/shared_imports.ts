/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { AppServicesContext } from './types';
import { useKibana as _useKibana } from '../../../../src/plugins/kibana_react/public';

export { KibanaContextProvider } from '../../../../src/plugins/kibana_react/public';
export const useKibana = () => _useKibana<AppServicesContext>();
