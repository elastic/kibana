/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IToasts } from '@kbn/core/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { DiscoverStateContainer } from '@kbn/discover-plugin/public';
import { DataView } from '@kbn/data-views-plugin/common';
import { i18n } from '@kbn/i18n';
import { actions, createMachine } from 'xstate';
import { isDatasetSelection } from '../../../utils/dataset_selection';
import { DEFAULT_CONTEXT } from './defaults';
import type {
  LogExplorerProfileContext,
  LogExplorerProfileEvent,
  LogExplorerProfileTypestate,
} from './types';
import { initializeFromUrl, updateUrlState } from './url_state_storage_service';

export const createPureLogExplorerProfileStateMachine = (
  initialContext: LogExplorerProfileContext
) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QBkD2UCiAPADgG1QCcxCAFQ1AMwEs8wA6AVwDtrWAXagQz2oC9IAYgDaABgC6iUDlSxqnVMykgsiAIwAOAMz0NagEwBWUaICcWgCxrTogOz6ANCACeifZfoA2C1rVbPGoam3pYaAL5hTmiYuATEZBQ0dPRs8ty8fGxQAGIUALYAqoR4ghCKDGwAbqgA1gzR2PhEJORUtBUc6fxZuaiFxQhVqADGXArMYuKTyjJy48qqCMYauvp6+haGGrZWW55Orgj6RvSmap6eooa+7hoa+hFR6I1xLYntKZ083cw5+UUlEgUQj0fBjShEPL0BqxZoJNrJVKcb6ZX69fp4QbMaqjcaTaZIECzNKKBaIYymXT3PQGNamYw7A7qMz0KxXUz6UQ+Cz6PxaR4gGFNeKtJIMYbEMZZAAiYy4ADVqGAAO6lcqfap1aHPWEi97JCVgKW-WXsBVK5VYnFSxT4iQzWQkpSExb0tT0Y4XAz+CyBAJMo76Tz0HamcwabyGexqQyeAVC17wsVMHAQY1QAEAZTN7DAauYHU19R1wreCIYjFT6azObAVpGNomEgJ0kd8xd6i0910XPufgsohjawDG0p9m8AT0hgstk8hnjJcToo+SK6AggggKpGlAEEACoYAD6u73O8zGD3h-PyAwAGE9wBJADyADkW0S29RSR2EH5uxpe15SxB0MYcXEQPRWTDDktEMWNDBjTw1AiSIQGYVAIDgZQEzhZc6AdOYv2dUBFgAWn2cCEFIwxTmguj6IjBcYlLJMPhYVcUUgAinTJBAeRHLQdBCc5-EEiNQNsJiXlw-UOjSFEen+YpuPbEi3FsFYNFMDRNk5QJRC0UwRzUUR6DUHwYy7QdgM8B5UJwvVy3oQ101Nc0VRUojeNsNRbHoYwTC0dxPB2OcRxZLQzHuLkAhMWxBKk3Uy2TSs004X4azGMBPO-NTfxjPyOWsLQfLsadrhHE5PV9KMo18krEpYvC5ORDIuMJYlVJUdQQtMzx6RnURAh8jSLBHHwzIsi4zj8eKLAsFCwiAA */
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
        notifyRestoreFailed: actions.pure(() => undefined),
        storeDatasetSelection: actions.assign((_context, event) =>
          'data' in event && isDatasetSelection(event.data)
            ? {
                datasetSelection: event.data,
              }
            : {}
        ),
        storeDataView: actions.assign((_context, event) =>
          'data' in event && event.data instanceof DataView
            ? {
                dataView: event.data,
              }
            : {}
        ),
      },
    }
  );

export interface LogExplorerProfileStateMachineDependencies {
  initialContext?: LogExplorerProfileContext;
  dataViews: DataViewsPublicPluginStart;
  stateContainer: DiscoverStateContainer;
  toasts: IToasts;
}

export const createLogExplorerProfileStateMachine = ({
  initialContext = DEFAULT_CONTEXT,
  dataViews,
  stateContainer,
  toasts,
}: LogExplorerProfileStateMachineDependencies) =>
  createPureLogExplorerProfileStateMachine(initialContext).withConfig({
    actions: {
      notifyRestoreFailed: () => {
        toasts.addWarning({
          title: i18n.translate('discover.invalidFiltersWarnToast.title', {
            defaultMessage: "We couldn't restore your datasets selection.",
          }),
          text: i18n.translate('discover.invalidFiltersWarnToast.description', {
            defaultMessage: 'We switched to "All log datasets" as the default selection.',
          }),
        });
      },
    },
    services: {
      initializeFromUrl: initializeFromUrl({ stateContainer }),
      createDataView: async (context) => {
        const dataView = await dataViews.create(context.datasetSelection.toDataviewSpec());

        stateContainer.actions.setDataView(dataView);
        return dataView;
      },
      updateUrlState: updateUrlState({ stateContainer }),
    },
  });
