/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  KibanaContextProvider,
  useKibana,
} from '../../../../../../../src/plugins/kibana_react/public/context/context';
import {
  useUiSetting,
  useUiSetting$,
} from '../../../../../../../src/plugins/kibana_react/public/ui_settings/use_ui_setting';
import type { StartServices } from '../../../types';

const useTypedKibana = () => useKibana<StartServices>();

export { KibanaContextProvider, useTypedKibana as useKibana, useUiSetting, useUiSetting$ };
