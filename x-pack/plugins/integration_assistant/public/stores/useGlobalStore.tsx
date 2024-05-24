import { devtools } from 'zustand/middleware';
import { create } from 'zustand';
import {
  integrationBuilderStepsState,
  ecsMappingFormState,
  integrationBuilderChainItemsState,
  ecsMappingTableState,
  integrationBuilderContinueState,
  integrationBuilderIsLoadingState,
  integrationBuilderHeaderState,
} from '@Stores/integrationBuilderStore';

import { sideNavState } from '@Stores/sideNavStore';

export const useGlobalStore = create<
  IntegrationBuilderStepsState &
    EcsMappingFormState &
    IntegrationBuilderChainItemsState &
    EcsMappingTableState &
    IntegrationBuilderContinueState &
    IntegrationBuilderIsLoadingState &
    IntegrationBuilderHeaderState &
    SideNavState
>()(
  devtools((...a) => ({
    ...integrationBuilderStepsState(...a),
    ...ecsMappingFormState(...a),
    ...integrationBuilderChainItemsState(...a),
    ...ecsMappingTableState(...a),
    ...integrationBuilderContinueState(...a),
    ...integrationBuilderIsLoadingState(...a),
    ...integrationBuilderHeaderState(...a),
    ...sideNavState(...a),
  })),
);
