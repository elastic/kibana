/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { StartDependencies } from '../plugin';

export type CoreStartWithStartDeps = CoreStart & {
  plugins: { start: StartDependencies };
} & StartDependencies;

const useTypedKibana = <AdditionalServices extends object = {}>() =>
  useKibana<AdditionalServices & CoreStartWithStartDeps>();

export { useTypedKibana as useKibana };
