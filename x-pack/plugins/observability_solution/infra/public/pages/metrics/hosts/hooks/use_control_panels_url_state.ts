/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { pick } from 'lodash';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { constant, identity } from 'fp-ts/lib/function';
import type { DataView } from '@kbn/data-views-plugin/public';
import { useMemo } from 'react';
import { useUrlState } from '../../../../utils/use_url_state';

const HOST_FILTERS_URL_STATE_KEY = 'controlPanels';

export const availableControlsPanels = {
  HOST_OS_NAME: 'host.os.name',
  CLOUD_PROVIDER: 'cloud.provider',
  SERVICE_NAME: 'service.name',
};

const controlPanelConfigs: ControlPanels = {
  [availableControlsPanels.HOST_OS_NAME]: {
    order: 0,
    width: 'medium',
    grow: false,
    type: 'optionsListControl',
    explicitInput: {
      id: availableControlsPanels.HOST_OS_NAME,
      fieldName: availableControlsPanels.HOST_OS_NAME,
      title: 'Operating System',
    },
  },
  [availableControlsPanels.CLOUD_PROVIDER]: {
    order: 1,
    width: 'medium',
    grow: false,
    type: 'optionsListControl',
    explicitInput: {
      id: availableControlsPanels.CLOUD_PROVIDER,
      fieldName: availableControlsPanels.CLOUD_PROVIDER,
      title: 'Cloud Provider',
    },
  },
  [availableControlsPanels.SERVICE_NAME]: {
    order: 2,
    width: 'medium',
    grow: false,
    type: 'optionsListControl',
    explicitInput: {
      id: availableControlsPanels.SERVICE_NAME,
      fieldName: availableControlsPanels.SERVICE_NAME,
      title: 'Service Name',
    },
  },
};

const availableControlPanelFields = Object.values(availableControlsPanels);

export const useControlPanels = (
  dataView: DataView | undefined
): [ControlPanels, (state: ControlPanels) => void] => {
  const defaultState = useMemo(() => getVisibleControlPanelsConfig(dataView), [dataView]);

  const [controlPanels, setControlPanels] = useUrlState<ControlPanels>({
    defaultState,
    decodeUrlState,
    encodeUrlState,
    urlStateKey: HOST_FILTERS_URL_STATE_KEY,
  });

  /**
   * Configure the control panels as
   * 1. Available fields from the data view
   * 2. Existing filters from the URL parameter (not colliding with allowed fields from data view)
   * 3. Enhanced with dataView.id
   */
  const controlsPanelsWithId = dataView
    ? mergeDefaultPanelsWithUrlConfig(dataView, controlPanels)
    : ({} as ControlPanels);

  return [controlsPanelsWithId, setControlPanels];
};

/**
 * Utils
 */
const getVisibleControlPanels = (dataView: DataView | undefined) => {
  return availableControlPanelFields.filter(
    (panelKey) => dataView?.fields.getByName(panelKey) !== undefined
  );
};

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

const mergeDefaultPanelsWithUrlConfig = (dataView: DataView, urlPanels: ControlPanels = {}) => {
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

type ControlPanels = rt.TypeOf<typeof ControlPanelRT>;

const encodeUrlState = (value: ControlPanels) => {
  if (value) {
    // Remove the dataView.id on update to make the control panels portable between data views
    const cleanPanels = cleanControlPanels(value);

    return ControlPanelRT.encode(cleanPanels);
  }
};

const decodeUrlState = (value: unknown) => {
  if (value) {
    return pipe(ControlPanelRT.decode(value), fold(constant({}), identity));
  }
};
