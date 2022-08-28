/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  KibanaContextProvider,
  useKibana,
  useUiSetting,
  useUiSetting$,
  withKibana,
} from '@kbn/kibana-react-plugin/public';
import type { ApmBase } from '@elastic/apm-rum';
import type { StartServices } from '../../../types';

const useTypedKibana = () => useKibana<StartServices>();

export {
  ApmBase,
  KibanaContextProvider,
  useTypedKibana as useKibana,
  useUiSetting,
  useUiSetting$,
  withKibana,
};
