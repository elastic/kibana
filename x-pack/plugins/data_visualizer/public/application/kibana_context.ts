/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from 'kibana/public';
import { KibanaReactContextValue, useKibana } from '../../../../../src/plugins/kibana_react/public';
import type { DataVisualizerStartDependencies } from '../plugin';
import type { IStorageWrapper } from '../../../../../src/plugins/kibana_utils/public';

export type StartServices = CoreStart &
  DataVisualizerStartDependencies & {
    storage: IStorageWrapper;
  };
export type DataVisualizerKibanaReactContextValue = KibanaReactContextValue<StartServices>;
export const useDataVisualizerKibana = () => useKibana<StartServices>();
