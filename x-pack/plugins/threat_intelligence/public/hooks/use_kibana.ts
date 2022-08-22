/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  KibanaContextProvider,
  useKibana,
  context as KibanaContext,
} from '@kbn/kibana-react-plugin/public';
import { Services } from '../types';

const useTypedKibana = () => useKibana<Services>();

export { KibanaContextProvider, useTypedKibana as useKibana, KibanaContext };
