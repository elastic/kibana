/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash';
import type { DataView } from '@kbn/data-views-plugin/public';
import { actions } from 'xstate';
import { ControlPanels, HostsViewQueryContext, HostsViewQueryEvent } from './types';

export const availableControlsPanels = {
  HOST_OS_NAME: 'host.os.name',
  CLOUD_PROVIDER: 'cloud.provider',
  SERVICE_NAME: 'service.name',
};

export const defaultControlPanels: ControlPanels = {
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

export const updateControlsContextFromControlPanelsUpdate = actions.assign(
  (context: HostsViewQueryContext, event: HostsViewQueryEvent) => {
    if ('controlPanels' in event && event.type === 'UPDATE_CONTROL_PANELS') {
      return {
        controlPanels: mergeDefaultPanelsWithUrlConfig(context.dataView, event.controlPanels ?? {}),
      };
    } else {
      return {};
    }
  }
);

export const updateControlPanelsContextFromUrl = actions.assign(
  (context: HostsViewQueryContext, event: HostsViewQueryEvent) => {
    if (event.type === 'INITIALIZED_FROM_URL') {
      return {
        ...('controlPanels' in event && event.controlPanels
          ? {
              controlPanels: mergeDefaultPanelsWithUrlConfig(
                context.dataView,
                event.controlPanels ?? {}
              ),
            }
          : {}),
      };
    } else {
      return {};
    }
  }
);

export const updatePanelFiltersContextFromControlPanelsUpdate = actions.assign(
  (context: HostsViewQueryContext, event: HostsViewQueryEvent) => {
    if (event.type === 'PANEL_FILTERS_CHANGED') {
      return {
        ...('panelFilters' in event && event.panelFilters
          ? {
              panelFilters: event.panelFilters,
            }
          : {}),
      };
    } else {
      return {};
    }
  }
);

const getVisibleControlPanels = (dataView: DataView | undefined) => {
  return availableControlPanelFields.filter(
    (panelKey) => dataView?.fields.getByName(panelKey) !== undefined
  );
};

const getVisibleControlPanelsConfig = (dataView: DataView | undefined) => {
  return getVisibleControlPanels(dataView).reduce((panelsMap, panelKey) => {
    const config = defaultControlPanels[panelKey];

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

export const cleanControlPanels = (controlPanels: ControlPanels) => {
  return Object.entries(controlPanels).reduce((acc, [key, controlPanelConfig]) => {
    const { explicitInput } = controlPanelConfig;
    const { dataViewId, ...rest } = explicitInput;
    return {
      ...acc,
      [key]: { ...controlPanelConfig, explicitInput: rest },
    };
  }, {});
};

export const mergeDefaultPanelsWithUrlConfig = (
  dataView: DataView,
  urlPanels: ControlPanels = {}
) => {
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
