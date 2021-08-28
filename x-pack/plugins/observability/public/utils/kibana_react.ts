/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreStart } from '../../../../../src/core/public/types';
import { useKibana } from '../../../../../src/plugins/kibana_react/public/context/context';
import { Storage } from '../../../../../src/plugins/kibana_utils/public/storage/storage';
import type { ObservabilityPublicPluginsStart } from '../plugin';

export type StartServices = CoreStart &
  ObservabilityPublicPluginsStart & {
    storage: Storage;
  };
const useTypedKibana = () => useKibana<StartServices>();

export { useTypedKibana as useKibana };
