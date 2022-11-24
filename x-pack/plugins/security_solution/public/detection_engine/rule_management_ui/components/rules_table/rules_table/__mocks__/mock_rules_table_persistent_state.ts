import { useKibana } from '../../../../../../common/lib/kibana';
import { useInitializeUrlParam } from '../../../../../../common/utils/global_query_string';
import type { RulesTableSavedState } from '../rules_table_saved_state';

export function mockRulesTablePersistedState({
  urlState,
  storageState,
}: {
  urlState: RulesTableSavedState | null;
  storageState: RulesTableSavedState | null;
}): void {
  (useInitializeUrlParam as jest.Mock).mockImplementation(
    (_, cb: (params: RulesTableSavedState | null) => void) => cb(urlState)
  );
  (useKibana as jest.Mock).mockReturnValue({
    services: { sessionStorage: { get: jest.fn().mockReturnValue(storageState) } },
  });
}
