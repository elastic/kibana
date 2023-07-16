/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { pick } from 'lodash';
import type { DataView } from '@kbn/data-views-plugin/public';
import { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { useCallback, useMemo, useState } from 'react';

export const CONTROL_PANELS_URL_KEY = 'controlPanels';

const availableControlsPanels = {
  NAMESPACE: 'data_stream.namespace',
};

const controlPanelConfigs: ControlPanels = {
  [availableControlsPanels.NAMESPACE]: {
    order: 0,
    width: 'medium',
    grow: false,
    type: 'optionsListControl',
    explicitInput: {
      id: availableControlsPanels.NAMESPACE,
      fieldName: availableControlsPanels.NAMESPACE,
      title: 'Namespace',
    },
  },
};
const availableControlPanelFields = Object.values(availableControlsPanels);

export const useControlPanelsUrlState = (
  dataView: DataView | undefined,
  stateStorage: IKbnUrlStateStorage
): [ControlPanels, (state: ControlPanels | undefined) => void] => {
  const defaultControlPanels = useMemo(() => getVisibleControlPanelsConfig(dataView), [dataView]);

  const urlControlPanels = useMemo(() => {
    const urlPanels = stateStorage.get<ControlPanels>(CONTROL_PANELS_URL_KEY);

    return isValidState(urlPanels) ? urlPanels : defaultControlPanels;
  }, [defaultControlPanels, stateStorage]);

  const [state, setState] = useState<ControlPanels>(urlControlPanels!);

  const setControlPanels = useCallback(
    (newState: ControlPanels | undefined) => {
      const validatedControlPanels = isValidState(newState) ? newState : defaultControlPanels;

      setState(validatedControlPanels!);
    },
    [defaultControlPanels]
  );

  const controlsPanelsWithId = dataView
    ? mergeDefaultPanelsWithUrlConfig(dataView, state)
    : ({} as ControlPanels);

  stateStorage.set(CONTROL_PANELS_URL_KEY, cleanControlPanels(controlsPanelsWithId), {
    replace: true,
  });

  return [controlsPanelsWithId, setControlPanels];
};

/**
 * Utils
 */
const isValidState = (state: ControlPanels | undefined | null): boolean => {
  return Object.keys(state ?? {}).length > 0 && ControlPanelRT.is(state);
};

const getVisibleControlPanels = (dataView: DataView | undefined) =>
  availableControlPanelFields.filter(
    (panelKey) => dataView?.fields.getByName(panelKey) !== undefined
  );

const getVisibleControlPanelsConfig = (dataView: DataView | undefined) => {
  return getVisibleControlPanels(dataView).reduce((panelsMap, panelKey) => {
    const config = controlPanelConfigs[panelKey];

    return { ...panelsMap, [panelKey]: config };
  }, {} as ControlPanels);
};

const addDataViewIdToControlPanels = (controlPanels: ControlPanels, dataViewId: string = '') => {
  return Object.entries(controlPanels).reduce((acc, [key, controlPanelConfig]) => {
    return {
      ...acc,
      [key]: {
        ...controlPanelConfig,
        explicitInput: { ...controlPanelConfig.explicitInput, dataViewId },
      },
    };
  }, {});
};

const cleanControlPanels = (controlPanels: ControlPanels) => {
  return Object.entries(controlPanels).reduce((acc, [key, controlPanelConfig]) => {
    const { explicitInput } = controlPanelConfig;
    const { dataViewId, ...rest } = explicitInput;
    return {
      ...acc,
      [key]: { ...controlPanelConfig, explicitInput: rest },
    };
  }, {});
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

const PanelRT = rt.type({
  order: rt.number,
  width: rt.union([rt.literal('medium'), rt.literal('small'), rt.literal('large')]),
  grow: rt.boolean,
  type: rt.string,
  explicitInput: rt.intersection([
    rt.type({ id: rt.string }),
    rt.partial({
      dataViewId: rt.string,
      fieldName: rt.string,
      title: rt.union([rt.string, rt.undefined]),
      selectedOptions: rt.array(rt.string),
    }),
  ]),
});

const ControlPanelRT = rt.record(rt.string, PanelRT);

export type ControlPanels = rt.TypeOf<typeof ControlPanelRT>;
