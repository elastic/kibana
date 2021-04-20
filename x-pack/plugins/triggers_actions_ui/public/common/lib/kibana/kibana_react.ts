/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  KibanaContextProvider,
  KibanaReactContextValue,
  useKibana,
  useUiSetting,
  useUiSetting$,
  withKibana,
} from '../../../../../../../src/plugins/kibana_react/public';
import { TriggersAndActionsUiServices } from '../../../application/app';

export type KibanaContext = KibanaReactContextValue<TriggersAndActionsUiServices>;
export interface WithKibanaProps {
  kibana: KibanaContext;
}

const useTypedKibana = () => useKibana<TriggersAndActionsUiServices>();

export {
  KibanaContextProvider,
  useTypedKibana as useKibana,
  useUiSetting,
  useUiSetting$,
  withKibana,
};
