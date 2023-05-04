/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import { KibanaReactContextValue, useKibana } from '@kbn/kibana-react-plugin/public';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type { DataVisualizerStartDependencies } from '../plugin';

export type StartServices = CoreStart &
  DataVisualizerStartDependencies & {
    storage: IStorageWrapper;
  };
export type DataVisualizerKibanaReactContextValue = KibanaReactContextValue<StartServices>;
export const useDataVisualizerKibana = () => useKibana<StartServices>();
