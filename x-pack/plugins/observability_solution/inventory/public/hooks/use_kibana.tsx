/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import { KibanaReactContextValue, useKibana } from '@kbn/kibana-react-plugin/public';
import { InventoryStartDependencies } from '../types';
import { InventoryServices } from '../services/types';

export type InventoryKibanaContext = CoreStart & InventoryStartDependencies & InventoryServices;

const useTypedKibana = useKibana as () => KibanaReactContextValue<InventoryKibanaContext>;

export { useTypedKibana as useKibana };
