/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import _ from 'lodash';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { constant, identity } from 'fp-ts/lib/function';
import { DataView } from '@kbn/data-views-plugin/public';
import { useUrlState } from '../../../../utils/use_url_state';

const HOST_FILTERS_URL_STATE_KEY = 'controlPanels';

const availableControlsPanels = {
  HOST_OS_NAME: 'host.os.name',
  CLOUD_PROVIDER: 'cloud.provider',
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
};

const availableControlPanelFields = Object.values(availableControlsPanels);

export const useControlPanels = (
  dataView: DataView
): [ControlPanels, (state: ControlPanels) => void] => {
  const defaultState = getVisibleControlPanelsConfig(dataView);

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
  const controlsPanelsWithId = mergeDefaultPanelsWithUrlConfig(dataView, controlPanels);

  return [controlsPanelsWithId, setControlPanels];
};

/**
 * Utils
 */
const getVisibleControlPanels = (dataView: DataView) => {
  return availableControlPanelFields.filter(
    (panelKey) => dataView.fields.getByName(panelKey) !== undefined
  );
};

const getVisibleControlPanelsConfig = (dataView: DataView) => {
  return getVisibleControlPanels(dataView).reduce((panelsMap, panelKey) => {
    const config = controlPanelConfigs[panelKey];

    return { ...panelsMap, [panelKey]: config };
  }, {});
};

const addDataViewIdToControlPanels = (controlPanels: ControlPanels, dataViewId: string = '') => {
  return _.mapValues(controlPanels, (controlPanelConfig) => {
    const controlsClone = _.cloneDeep(controlPanelConfig);
    controlsClone.explicitInput.dataViewId = dataViewId;
    return controlsClone;
  });
};

const cleanControlPanels = (controlPanels: ControlPanels) => {
  return _.mapValues(controlPanels, (controlPanelConfig) => {
    const controlsClone = _.cloneDeep(controlPanelConfig);
    delete controlsClone.explicitInput.dataViewId;
    return controlsClone;
  });
};

const mergeDefaultPanelsWithUrlConfig = (dataView: DataView, urlPanels: ControlPanels = {}) => {
  // Get default panel configs from existing fields in data view
  const visiblePanels = getVisibleControlPanelsConfig(dataView);

  // Get list of panel which can be overridden to avoid merging additional config from url
  const existingKeys = Object.keys(visiblePanels);
  const controlPanelsToOverride = _.pick(urlPanels, existingKeys);

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
