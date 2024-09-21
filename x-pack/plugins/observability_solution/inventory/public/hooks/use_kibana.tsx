/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { type KibanaReactContextValue, useKibana } from '@kbn/kibana-react-plugin/public';
import type { InventoryStartDependencies } from '../types';
import type { InventoryServices } from '../services/types';

export type InventoryKibanaContext = CoreStart & InventoryStartDependencies & InventoryServices;

const useTypedKibana = useKibana as () => KibanaReactContextValue<InventoryKibanaContext>;

export { useTypedKibana as useKibana };
