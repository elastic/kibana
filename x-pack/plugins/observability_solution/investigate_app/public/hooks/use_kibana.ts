/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { InvestigateAppStartDependencies } from '../types';
import { InvestigateAppServices } from '../services/types';

export interface InvestigateAppKibanaContext {
  core: CoreStart;
  dependencies: { start: InvestigateAppStartDependencies };
  services: InvestigateAppServices;
}

const useTypedKibana = () => {
  return useKibana<InvestigateAppKibanaContext>().services;
};

export { useTypedKibana as useKibana };
