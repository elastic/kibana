/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { DiscoverStateContainer } from '@kbn/discover-plugin/public';
import { actions, createMachine } from 'xstate';
import type {
  LogExplorerProfileContext,
  LogExplorerProfileEvent,
  LogExplorerProfileTypestate,
} from './types';
import { initializeFromUrl, updateUrlState } from './url_state_storage_service';

export const createPureLogExplorerProfileStateMachine = (
  initialContext: LogExplorerProfileContext
) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QBkD2UCiAPADgG1QCcxCAFQ1AMwEs8wA6AVwDtrWAXagQz2oC9IAYgDaABgC6iUDlSxqnVMykgsiAIwAOAMz0NagEwBWADQgAnuu30AbAHYAnNY23DAX1em0mXAWJkKNHT0bPLcvHxsUABiFAC2AKqEeIIQigxsAG6oANYMXtj4RCTkVLTpHGH8kTGoCUkImagAxlwKzGLiHcoycm3KqgiGohq6+npGphYIarYALPT2hloGbh4g+T5F-qVBIZw8VczRcYnJJBSE9PitlESx9BuFfiWB5aEHEUc1dXgNzFktNodLpIEA9UKKfqIIb2XQaMYrSaIaxqXSGQyzJwudyedAFXzFAJlehNYitSIAEVaXAAatQwAB3FJpYL-HJ5PGbZ5EoKksDko5U9i0+kMv4A8mKYESbqyCFKUEDeyY+j6fTWQzWCbmdSGWEaaz2Bxqayms2mnHrTlPQk7BiwMzMJqRU4AZWF7DAzOY5SyuQe1oJ21e9AdTpdSXdrTA4uakvaEhB0jlfUV6i01h01lE9i0ermBjUaiR03hukxedmJvNFrWjyDL2Je0qAgggnipApAEEACoYAD63Z7XddGB7-dHyAwAGEewBJADyADkk2CU9RIWnphjbKqNdmjVX9EWS84bLMtGr7NXzbN3GtmKgIHBlPWto26LLehuFaABgBaawS3-Ixz1mJYVktN9uTtJhWAqD5IC-eUoQQWZ9BLTR9BsBwsVWXFvBtYMmwQ8JqhOJJkNTP9EH0WwRg0ewNAvFxML1egZkcZx8KtQiGx5Bg+QFKAhRFRkqJ-VDbBmegTB1bcRi0CsMRvc0oMDd8BNDR1nSON0PTACTNxo6Y1EMbD7GPDR8yPE95LMxTlKrGtawI-FNNg5tEIgIzfxUdQtWsBYtDmZiC2PYt7MY+gc0zFSXOse9XCAA */
  createMachine<LogExplorerProfileContext, LogExplorerProfileEvent, LogExplorerProfileTypestate>(
    {
      context: initialContext,
      predictableActionArguments: true,
      id: 'LogExplorerProfile',
      initial: 'uninitialized',
      states: {
        uninitialized: {
          always: 'initializingFromUrl',
        },
        initializingFromUrl: {
          invoke: {
            src: 'initializeFromUrl',
            onDone: {
              target: 'creatingDataView',
              actions: ['storeDatasetSelection'],
            },
            onError: {
              target: 'creatingDataView',
              actions: ['notifyRestoreFailed'],
            },
          },
        },
        creatingDataView: {
          invoke: {
            src: 'createDataView',
            onDone: {
              target: 'updatingUrlState',
              actions: ['storeDataView'],
            },
          },
        },
        updatingUrlState: {
          invoke: {
            src: 'updateUrlState',
            onDone: {
              target: 'initialized',
            },
          },
        },
        initialized: {
          on: {
            UPDATE_DATASET_SELECTION: {
              actions: ['storeDatasetSelection'],
              target: 'creatingDataView',
            },
          },
        },
      },
    },
    {
      actions: {
        storeDatasetSelection: actions.assign((_context, event) =>
          'data' in event
            ? {
                datasetSelection: event.data,
              }
            : {}
        ),
        storeDataView: actions.assign((_context, event) =>
          'data' in event
            ? {
                dataView: event.data,
              }
            : {}
        ),
      },
    }
  );

export interface LogExplorerProfileStateMachineDependencies {
  dataViews: DataViewsPublicPluginStart;
  stateContainer: DiscoverStateContainer;
}

export const createLogExplorerProfileStateMachine = (
  initialContext: LogExplorerProfileContext,
  { dataViews, stateContainer }: LogExplorerProfileStateMachineDependencies
) =>
  createPureLogExplorerProfileStateMachine(initialContext).withConfig({
    services: {
      initializeFromUrl: initializeFromUrl({ stateContainer }),
      createDataView: async (context, event) => {
        const dataView = await dataViews.create(context.datasetSelection.toDataviewSpec());
        stateContainer.internalState.transitions.appendAdHocDataViews(dataView);
        return dataView;
      },
      updateUrlState: updateUrlState({ stateContainer }),
    },
  });
