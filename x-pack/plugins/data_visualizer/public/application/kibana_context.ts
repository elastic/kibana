/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreStart } from '../../../../../src/core/public/types';
import { useKibana } from '../../../../../src/plugins/kibana_react/public/context/context';
import type { KibanaReactContextValue } from '../../../../../src/plugins/kibana_react/public/context/types';
import type { DataVisualizerStartDependencies } from '../plugin';

export type StartServices = CoreStart & DataVisualizerStartDependencies;
export type DataVisualizerKibanaReactContextValue = KibanaReactContextValue<StartServices>;
export const useDataVisualizerKibana = () => useKibana<StartServices>();
