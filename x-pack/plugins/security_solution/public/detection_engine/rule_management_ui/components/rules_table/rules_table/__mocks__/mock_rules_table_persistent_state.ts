/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '../../../../../../common/lib/kibana';
import { useGetInitialUrlParamValue } from '../../../../../../common/utils/global_query_string/helpers';
import type {
  RulesTableStorageSavedState,
  RulesTableUrlSavedState,
} from '../rules_table_saved_state';

export function mockRulesTablePersistedState({
  urlState,
  storageState,
}: {
  urlState: RulesTableUrlSavedState | null;
  storageState: RulesTableStorageSavedState | null;
}): void {
  (useGetInitialUrlParamValue as jest.Mock).mockReturnValue(jest.fn().mockReturnValue(urlState));
  (useKibana as jest.Mock).mockReturnValue({
    services: { sessionStorage: { get: jest.fn().mockReturnValue(storageState) } },
  });
}
