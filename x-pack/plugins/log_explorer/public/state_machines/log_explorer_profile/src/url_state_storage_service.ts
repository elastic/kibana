/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { InvokeCreator } from 'xstate';
import { pick, mapValues } from 'lodash';
import deepEqual from 'fast-deep-equal';
import { DiscoverStateContainer } from '@kbn/discover-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { MESSAGE_FIELD } from '../../../../common/constants';
import {
  AllDatasetSelection,
  decodeDatasetSelectionId,
  hydrateDatasetSelection,
  isDatasetSelection,
} from '../../../utils/dataset_selection';
import {
  ControlPanelRT,
  ControlPanels,
  LogExplorerProfileContext,
  LogExplorerProfileEvent,
} from './types';
import {
  availableControlPanelFields,
  controlPanelConfigs,
  CONTROL_PANELS_URL_KEY,
} from './defaults';

interface LogExplorerProfileUrlStateDependencies {
  stateContainer: DiscoverStateContainer;
}

export const listenUrlChange =
  ({
    stateContainer,
  }: LogExplorerProfileUrlStateDependencies): InvokeCreator<
    LogExplorerProfileContext,
    LogExplorerProfileEvent
  > =>
  (context) =>
  (send) => {
    const unsubscribe = stateContainer.appState.subscribe((nextState) => {
      const { index } = nextState;
      const prevIndex = stateContainer.appState.getPrevious().index;

      // Preventing update if the index didn't change
      if (prevIndex === index) return;

      try {
        const datasetSelection = extractDatasetSelectionFromIndex({ index, context });

        if (isDatasetSelection(datasetSelection)) {
          send({ type: 'UPDATE_DATASET_SELECTION', data: datasetSelection });
        }
      } catch (error) {
        send({ type: 'DATASET_SELECTION_RESTORE_FAILURE' });
      }
    });

    return () => unsubscribe();
  };

export const initializeFromUrl =
  ({
    stateContainer,
  }: LogExplorerProfileUrlStateDependencies): InvokeCreator<
    LogExplorerProfileContext,
    LogExplorerProfileEvent
  > =>
  async (context) => {
    const { index } = stateContainer.appState.getState();

    return extractDatasetSelectionFromIndex({ index, context });
  };

export const initializeControlPanels =
  ({
    stateContainer,
  }: LogExplorerProfileUrlStateDependencies): InvokeCreator<
    LogExplorerProfileContext,
    LogExplorerProfileEvent
  > =>
  async (context) => {
    const urlPanels = stateContainer.stateStorage.get<ControlPanels>(CONTROL_PANELS_URL_KEY);
    const controlPanelsWithId = constructControlPanelsWithDataViewId(stateContainer, urlPanels!);

    return controlPanelsWithId;
  };

const extractDatasetSelectionFromIndex = ({
  index,
  context,
}: {
  index?: string;
  context: LogExplorerProfileContext;
}) => {
  // If the index parameter doesn't exists, use initialContext value or fallback to AllDatasetSelection
  if (!index) {
    return context.datasetSelection ?? AllDatasetSelection.create();
  }

  const rawDatasetSelection = decodeDatasetSelectionId(index);
  const datasetSelection = hydrateDatasetSelection(rawDatasetSelection);

  return datasetSelection;
};

export const subscribeControlGroup =
  ({
    stateContainer,
  }: LogExplorerProfileUrlStateDependencies): InvokeCreator<
    LogExplorerProfileContext,
    LogExplorerProfileEvent
  > =>
  (context) =>
  (send) => {
    if (!('controlGroupAPI' in context)) return;

    const filtersSubscription = context.controlGroupAPI.onFiltersPublished$.subscribe(
      (newFilters) => {
        stateContainer.internalState.transitions.setCustomFilters(newFilters);
        stateContainer.actions.fetchData();
      }
    );

    // Keeps our state in sync with the url changes and makes sure it adheres to correct schema
    const urlSubscription = stateContainer.stateStorage
      .change$<ControlPanels>(CONTROL_PANELS_URL_KEY)
      .subscribe((controlPanels) => {
        if (!deepEqual(controlPanels, context.controlPanels)) {
          send({ type: 'UPDATE_CONTROL_PANELS', controlPanels });
        }
      });

    // Keeps the url in sync with the controls state after change
    const inputSubscription = context.controlGroupAPI.getInput$().subscribe(({ panels }) => {
      if (!deepEqual(panels, context.controlPanels)) {
        send({ type: 'UPDATE_CONTROL_PANELS', controlPanels: panels });
      }
    });

    return () => {
      filtersSubscription.unsubscribe();
      urlSubscription.unsubscribe();
      inputSubscription.unsubscribe();
    };
  };

export const updateControlPanels =
  ({
    stateContainer,
  }: LogExplorerProfileUrlStateDependencies): InvokeCreator<
    LogExplorerProfileContext,
    LogExplorerProfileEvent
  > =>
  async (context, event) => {
    if (!('controlGroupAPI' in context)) return;

    const newControlPanels =
      ('controlPanels' in event && event.controlPanels) || context.controlPanels;
    const controlPanelsWithId = constructControlPanelsWithDataViewId(
      stateContainer,
      newControlPanels!
    );

    context.controlGroupAPI.updateInput({ panels: controlPanelsWithId });

    return controlPanelsWithId;
  };

export const updateStateContainer =
  ({
    stateContainer,
  }: LogExplorerProfileUrlStateDependencies): InvokeCreator<
    LogExplorerProfileContext,
    LogExplorerProfileEvent
  > =>
  async () => {
    const { columns } = stateContainer.appState.getState();

    const shouldSetDefaultColumns =
      stateContainer.appState.isEmptyURL() || !columns || columns.length === 0;

    if (shouldSetDefaultColumns) {
      stateContainer.appState.update({ columns: [MESSAGE_FIELD] }, true);
    }
  };

/**
 * Utils
 */

const constructControlPanelsWithDataViewId = (
  stateContainer: DiscoverStateContainer,
  newControlPanels: ControlPanels
) => {
  const dataView = stateContainer.internalState.getState().dataView!;

  const validatedControlPanels = isValidState(newControlPanels)
    ? newControlPanels
    : getVisibleControlPanelsConfig(dataView);

  const controlsPanelsWithId = mergeDefaultPanelsWithUrlConfig(dataView, validatedControlPanels!);

  if (!deepEqual(controlsPanelsWithId, stateContainer.stateStorage.get(CONTROL_PANELS_URL_KEY))) {
    stateContainer.stateStorage.set(
      CONTROL_PANELS_URL_KEY,
      cleanControlPanels(controlsPanelsWithId),
      { replace: true }
    );
  }

  return controlsPanelsWithId;
};

const isValidState = (state: ControlPanels | undefined | null): boolean => {
  return Object.keys(state ?? {}).length > 0 && ControlPanelRT.is(state);
};

const getVisibleControlPanels = (dataView: DataView | undefined) =>
  availableControlPanelFields.filter(
    (panelKey) => dataView?.fields.getByName(panelKey) !== undefined
  );

export const getVisibleControlPanelsConfig = (dataView?: DataView) => {
  return getVisibleControlPanels(dataView).reduce((panelsMap, panelKey) => {
    const config = controlPanelConfigs[panelKey];

    return { ...panelsMap, [panelKey]: config };
  }, {} as ControlPanels);
};

const addDataViewIdToControlPanels = (controlPanels: ControlPanels, dataViewId: string = '') => {
  return mapValues(controlPanels, (controlPanelConfig) => ({
    ...controlPanelConfig,
    explicitInput: { ...controlPanelConfig.explicitInput, dataViewId },
  }));
};

const cleanControlPanels = (controlPanels: ControlPanels) => {
  return mapValues(controlPanels, (controlPanelConfig) => {
    const { explicitInput } = controlPanelConfig;
    const { dataViewId, ...rest } = explicitInput;
    return { ...controlPanelConfig, explicitInput: rest };
  });
};

const mergeDefaultPanelsWithUrlConfig = (dataView: DataView, urlPanels: ControlPanels) => {
  // Get default panel configs from existing fields in data view
  const visiblePanels = getVisibleControlPanelsConfig(dataView);

  // Get list of panel which can be overridden to avoid merging additional config from url
  const existingKeys = Object.keys(visiblePanels);
  const controlPanelsToOverride = pick(urlPanels, existingKeys);

  // Merge default and existing configs and add dataView.id to each of them
  return addDataViewIdToControlPanels(
    { ...visiblePanels, ...controlPanelsToOverride },
    dataView.id
  );
};
