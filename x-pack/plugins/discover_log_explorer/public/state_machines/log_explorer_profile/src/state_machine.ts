/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IToasts } from '@kbn/core/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { DiscoverStateContainer } from '@kbn/discover-plugin/public';
import { i18n } from '@kbn/i18n';
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
  /** @xstate-layout N4IgpgJg5mDOIC5QBkD2UCiAPADgG1QCcxCAFQ1AMwEs8wA6AVwDtrWAXagQz2oC9IAYgDaABgC6iUDlSxqnVMykgsiAIwAOAMz0NagEwBWUQDYAnBoAslwxo36ANCACeifVsv0TlrfpNqzS30zCxMtAF9wpzRMXAJiMgoaOno2eW5ePjYoADEKAFsAVUI8QQhFBjYAN1QAawYY7HwiEnIqWkqODP5svNQikoRq1ABjLgVmMXEp5Rk5CeVVBGMNXX09A1EAdjMtn0cXNyN6MzUTbxCzUQCtU0jo9Cb41qSO1K6eHuZcguLSkgohHo+HGlCI+XojTiLUS7RSaU4nyy3z6AzwQ2YNTGEymMyQIDm6UUi0QKzWG30212+ycrgQal89EsYUMWkMBi2GkCPnuIChzQSbWSDBGxHG2QAIuMuAA1ahgADuZQq7xq9Uhj2hgteKVFYHF3yl7Fl8oVGKx4sUuIks1kRKU+KWZnZ9H0fkM5h2okMZjCtKOJnoW2Moi0DOCuzZvP5z1hwqYOAgBqgfwAysb2GBlcxOmqGpqBS84QxGInk2mM2BzaNLZMJHjpHaFo71Fp7LpRMytpzLGZ1ls1P6EPpe0H3XZLoY9iZowXY0K3gjugIIIJCqQJQBBAAqGAA+lvt5vUxht3uT8gMABhbcASQA8gA5BsEpvUYkt+lt-Qdrs9vsaAOQ56Eylx9ls2wTjYkRRCAzCoBAcDKDGMILnQtrzO+DqgEsAC0JhDrhhgnGBpGXBoM6wSh2rFkwrAfJkkAYfaJIIEEQ7uDo3haLc3qhqy5yzrEhZxouDFfD8-R-MxzY4W4nK6BYlhqIY+gDqpdgcWooj0Go+waN6Hh6FclhCU8qE6iKYqcIa0pyoqMlYaxA5bPQIbXN6Po2LsHGiGY9C3BY2gBOsXJTmZWpFvGpZJjZKYlOm4xgI5H5yfSKmuX2mgrGoWwmOylgcccbr5T6ti9pYOwRSJaGdOkSJMfihKySo6gmBBXjOmppy5XsPgcT4un7D4KlqLlvqUZEQA */
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
  toasts: IToasts;
}

export const createLogExplorerProfileStateMachine = (
  initialContext: LogExplorerProfileContext,
  { dataViews, stateContainer, toasts }: LogExplorerProfileStateMachineDependencies
) =>
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
